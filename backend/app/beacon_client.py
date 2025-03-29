import requests
import snappy
from flask import current_app
import time
# import ssz
import json
from functools import lru_cache
import os
from urllib.parse import urlparse

# Simple in-memory cache to avoid redundant requests
block_cache = {}
blob_cache = {}
blob_fee_cache = {}

# Execution node URL - defaults to localhost:8545 if not set
def get_execution_node_url():
    exec_url = os.environ.get('EXECUTION_NODE_URL', 'http://localhost:8545')
    return exec_url

def get_transaction_size_from_execution_node(block_number):
    """
    Get transaction data size directly from execution node for more accurate size estimation
    """
    exec_url = get_execution_node_url()
    
    # Convert block_number to hex for JSON-RPC
    block_number_hex = hex(int(block_number))
    
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getBlockByNumber",
        "params": [block_number_hex, True],
        "id": 1
    }
    
    try:
        response = requests.post(
            exec_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=3
        )
        
        if response.status_code == 200:
            result = response.json().get('result', {})
            if not result:
                print(f"No result for block {block_number}")
                return None
                
            # Calculate total transaction size
            tx_size = 0
            transactions = result.get('transactions', [])
            
            # Process each transaction
            for tx in transactions:
                # Input data size
                input_data = tx.get('input', '')
                if input_data.startswith('0x'):
                    input_data = input_data[2:]
                tx_size += len(input_data) // 2
                
                # Transaction fields overhead (approximately 150 bytes per tx for basic fields)
                tx_size += 150
            
            # Add block header overhead (fixed size, approximately 500 bytes)
            header_size = 500
            
            # Add withdrawals if present (approximately 32 bytes per withdrawal)
            withdrawals = result.get('withdrawals', [])
            withdrawals_size = len(withdrawals) * 32
            
            total_size = tx_size + header_size + withdrawals_size
            print(f"Calculated execution payload size from execution node: {total_size} bytes")
            
            return total_size
        else:
            print(f"Failed to get block from execution node: {response.status_code}")
            return None
    
    except Exception as e:
        print(f"Error getting block from execution node: {str(e)}")
        return None

def get_block(block_id):
    """
    Fetch block data from beacon node in both JSON and SSZ formats.
    Compute sizes and compression metrics.
    
    Args:
        block_id: Can be 'head', a slot number, or a block root hash
    
    Returns:
        Dict with block metadata, size metrics, and component breakdown
    """
    # Check cache first, but skip cache for 'head' requests to ensure we always get fresh data
    if block_id != 'head' and block_id in block_cache:
        return block_cache[block_id]
    
    beacon_url = current_app.config['BEACON_NODE_URL']
    base_endpoint = f"/eth/v2/beacon/blocks/{block_id}"
    
    try:
        # 1. Get JSON data with timeout
        json_response = requests.get(
            f"{beacon_url}{base_endpoint}",
            headers={"Accept": "application/json"},
            timeout=5  # 5 second timeout
        )
        
        json_response.raise_for_status()  # Raise exception for non-200 responses
        
        json_data = json_response.json()
        
        # 2. Get SSZ binary data with timeout
        ssz_response = requests.get(
            f"{beacon_url}{base_endpoint}",
            headers={"Accept": "application/octet-stream"},
            timeout=5  # 5 second timeout
        )
        
        ssz_response.raise_for_status()  # Raise exception for non-200 responses
        
        ssz_bytes = ssz_response.content
        
        # 3. Compute metrics
        ssz_size = len(ssz_bytes)
        snappy_compressed = snappy.compress(ssz_bytes)
        snappy_size = len(snappy_compressed)
        compression_ratio = snappy_size / ssz_size if ssz_size > 0 else 0
        
        # 4. Extract block components
        block_message = json_data['data']['message']
        body = block_message['body']
        
        # 5. Compute component sizes
        components = {}
        try:
            # Get SSZ sizes from consensus spec where possible or use proportion estimation
            # Estimate size proportions based on consensus spec sizes
            # https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md
            
            # For execution payload, get individual component size from Beacon API if available
            if 'execution_payload' in body:
                execution_payload = body['execution_payload']
                slot_num = int(block_message['slot'])
                print(f"Processing execution payload for slot {slot_num}")
                
                # Regular processing with improved fallback values
                try:
                    # Try to get the block number from the execution payload
                    if 'block_number' in execution_payload:
                        block_number = execution_payload['block_number']
                        
                        # Try to get execution payload size from execution node
                        exec_size = get_transaction_size_from_execution_node(block_number)
                        if exec_size:
                            components['execution_payload'] = exec_size
                            print(f"Using execution node data for payload size: {exec_size}")
                        else:
                            # Fallback to other methods
                            raise Exception("Could not get execution payload size from execution node")
                    else:
                        raise Exception("No block number in execution payload")
                        
                except Exception as e:
                    print(f"Error getting execution payload through execution node: {str(e)}")
                    
                    # Try plan B: Get from Beacon API directly
                    try:
                        # Try to get execution payload directly in octet-stream format
                        payload_response = requests.get(
                            f"{beacon_url}/eth/v2/beacon/blocks/{block_id}/execution_payload",
                            headers={"Accept": "application/octet-stream"},
                            timeout=3
                        )
                        
                        if payload_response.status_code == 200:
                            # Got SSZ data directly
                            components['execution_payload'] = len(payload_response.content)
                            print(f"Got execution payload SSZ size: {components['execution_payload']} bytes")
                        else:
                            # Try to get the JSON data and estimate size better
                            try:
                                json_payload_response = requests.get(
                                    f"{beacon_url}/eth/v2/beacon/blocks/{block_id}/execution_payload",
                                    headers={"Accept": "application/json"},
                                    timeout=3
                                )
                                
                                if json_payload_response.status_code == 200:
                                    payload_data = json_payload_response.json()
                                    transactions = payload_data.get('data', {}).get('body', {}).get('transactions', [])
                                    
                                    # Calculate the size of all transactions
                                    tx_size = 0
                                    for tx in transactions:
                                        # Remove 0x prefix if present
                                        if tx.startswith('0x'):
                                            tx = tx[2:]
                                        # Each byte in hex is 2 characters
                                        tx_size += len(tx) // 2
                                    
                                    # Rest of the execution payload (header, etc.) is typically around 2KB
                                    # Add buffer for header and extras (conservatively)
                                    tx_overhead = 2048
                                    
                                    # Calculate the total execution payload size
                                    components['execution_payload'] = tx_size + tx_overhead
                                    print(f"Estimated execution payload size from JSON: {components['execution_payload']} bytes")
                                else:
                                    # Fall back to estimation based on proportion but use a higher value
                                    components['execution_payload'] = int(ssz_size * 0.85)
                                    print(f"Fallback estimation for execution payload: {components['execution_payload']} bytes")
                            except Exception as e:
                                print(f"Error processing JSON payload: {str(e)}")
                                # Fall back to estimation based on proportion
                                components['execution_payload'] = int(ssz_size * 0.85)
                    except Exception as e:
                        print(f"Error getting execution payload: {str(e)}")
                        # Fall back to estimation based on proportion
                        components['execution_payload'] = int(ssz_size * 0.85)
            
            if 'attestations' in body:
                # Calculate size based on number of attestations and average size
                attestations = body['attestations']
                components['attestations'] = int(len(attestations) * 112)  # ~112 bytes per attestation
                
            if 'deposits' in body:
                deposits = body['deposits']
                components['deposits'] = int(len(deposits) * 1240)  # ~1240 bytes per deposit
                
            if 'proposer_slashings' in body:
                slashings = body['proposer_slashings']
                components['proposer_slashings'] = int(len(slashings) * 416)  # ~416 bytes per slashing
                
            if 'attester_slashings' in body:
                slashings = body['attester_slashings']
                components['attester_slashings'] = int(len(slashings) * 624)  # ~624 bytes per slashing
                
            if 'voluntary_exits' in body:
                exits = body['voluntary_exits']
                components['voluntary_exits'] = int(len(exits) * 112)  # ~112 bytes per exit
                
            if 'sync_aggregate' in body:
                # Fixed size for sync aggregate
                components['sync_aggregate'] = 64  # Fixed size
                
            if 'blob_kzg_commitments' in body:
                commitments = body['blob_kzg_commitments']
                components['blob_kzg_commitments'] = int(len(commitments) * 48)  # 48 bytes per commitment
            
            # Normalize component sizes to ensure they don't exceed total SSZ size
            total_component_size = sum(components.values())
            print(f"Total component size before normalization: {total_component_size}, SSZ size: {ssz_size}")
            
            if total_component_size > ssz_size:
                # Scale down proportionally
                scale_factor = ssz_size / total_component_size
                for component in components:
                    components[component] = int(components[component] * scale_factor)
                    # Ensure no component is negative
                    if components[component] < 0:
                        components[component] = 0
                print(f"Scaled all components by factor: {scale_factor}")
            
        except Exception as e:
            print(f"Error computing component sizes: {str(e)}")
        
        # 6. Prepare response
        result = {
            'slot': int(block_message['slot']),
            'ssz_size': ssz_size,
            'snappy_size': snappy_size,
            'compression_ratio': round(compression_ratio, 4),
            'components': components,
            'block_root': json_data['data'].get('root', ''),
            'timestamp': int(time.time())
        }
        
        # Cache the result (limited to 100 blocks), but don't cache 'head' requests
        if block_id != 'head':
            if len(block_cache) >= 100:
                oldest_key = next(iter(block_cache))
                del block_cache[oldest_key]
            block_cache[block_id] = result
        
        return result
        
    except requests.exceptions.Timeout:
        print(f"Timeout fetching block {block_id} from beacon node")
        raise Exception(f"Beacon node API request timed out for block {block_id}")
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error fetching block {block_id}: {str(e)}")
        raise Exception(f"Beacon node API returned an error: {str(e)}")
        
    except requests.exceptions.RequestException as e:
        print(f"Request error fetching block {block_id}: {str(e)}")
        raise Exception(f"Failed to connect to beacon node: {str(e)}")
        
    except KeyError as e:
        print(f"Data structure error for block {block_id}: {str(e)}")
        raise Exception(f"Unexpected data structure in beacon node response")
        
    except Exception as e:
        print(f"Unexpected error processing block {block_id}: {str(e)}")
        raise Exception(f"Error processing block data: {str(e)}")

def get_blocks_range(start_slot, end_slot):
    """
    Fetch multiple blocks in the given slot range.
    
    Args:
        start_slot: Starting slot number
        end_slot: Ending slot number
    
    Returns:
        List of block data dictionaries
    """
    results = []
    for slot in range(start_slot, end_slot + 1):
        try:
            block_data = get_block(str(slot))
            results.append(block_data)
        except Exception as e:
            print(f"Error fetching block at slot {slot}: {str(e)}")
            # Create a placeholder block with only the slot number
            placeholder_block = {
                'slot': slot,
                'ssz_size': 0,
                'snappy_size': 0,
                'compression_ratio': 0,
                'components': {},
                'block_root': f"missing-block-{slot}",
                'timestamp': int(time.time()),
                'missing': True  # Indicate this is a placeholder
            }
            # results.append(placeholder_block)  # Uncomment to include missing blocks
            # Skip failed blocks but continue
            continue
    
    return results 

def get_blob_sidecars(block_id):
    """
    Fetch blob sidecars for a specific block from the beacon node.
    
    Args:
        block_id: Can be 'head', a slot number, or a block root hash
    
    Returns:
        Dict with blob information including count, sizes, and compression statistics
    """
    # Check cache first, but skip cache for 'head' requests
    if block_id != 'head' and block_id in blob_cache:
        return blob_cache[block_id]
    
    beacon_url = current_app.config['BEACON_NODE_URL']
    endpoint = f"/eth/v1/beacon/blob_sidecars/{block_id}"
    
    try:
        # Get blob sidecars
        response = requests.get(
            f"{beacon_url}{endpoint}",
            headers={"Accept": "application/json"},
            timeout=5  # 5 second timeout
        )
        
        response.raise_for_status()  # Raise exception for non-200 responses
        
        json_data = response.json()
        blobs = json_data.get('data', [])
        
        # Process blob data
        result = {
            'count': len(blobs),
            'blobs': []
        }
        
        total_size = 0
        total_compressed_size = 0
        
        for blob in blobs:
            blob_hex = blob.get('blob', '')
            
            # Skip if blob data is not provided
            if not blob_hex:
                continue
                
            # Convert hex to bytes
            try:
                # Remove '0x' prefix if present
                if blob_hex.startswith('0x'):
                    blob_hex = blob_hex[2:]
                
                blob_bytes = bytes.fromhex(blob_hex)
                blob_size = len(blob_bytes)
                
                # Count zero and non-zero bytes
                zero_bytes = blob_bytes.count(0)
                non_zero_bytes = blob_size - zero_bytes
                
                # Compress the blob using snappy
                compressed_blob = snappy.compress(blob_bytes)
                compressed_size = len(compressed_blob)
                
                # Calculate compression ratio
                compression_ratio = compressed_size / blob_size if blob_size > 0 else 0
                
                blob_info = {
                    'index': blob.get('index', ''),
                    'size': blob_size,
                    'compressed_size': compressed_size,
                    'compression_ratio': round(compression_ratio, 4),
                    'zero_bytes': zero_bytes,
                    'non_zero_bytes': non_zero_bytes,
                    'zero_percentage': round((zero_bytes / blob_size) * 100, 2) if blob_size > 0 else 0
                }
                
                result['blobs'].append(blob_info)
                total_size += blob_size
                total_compressed_size += compressed_size
            except Exception as e:
                print(f"Error processing blob data: {str(e)}")
                continue
        
        # Add aggregate statistics
        if result['count'] > 0:
            result['total_size'] = total_size
            result['total_compressed_size'] = total_compressed_size
            result['avg_compression_ratio'] = round(total_compressed_size / total_size, 4) if total_size > 0 else 0
            
        # Cache the result (limited to 100 blocks), but don't cache 'head' requests
        if block_id != 'head':
            if len(blob_cache) >= 100:
                oldest_key = next(iter(blob_cache))
                del blob_cache[oldest_key]
            blob_cache[block_id] = result
        
        return result
        
    except requests.exceptions.Timeout:
        print(f"Timeout fetching blob sidecars for block {block_id}")
        raise Exception(f"Beacon node API request timed out for blob sidecars of block {block_id}")
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error fetching blob sidecars for block {block_id}: {str(e)}")
        
        # Handle 404 gracefully - some blocks may not have blob sidecars
        if e.response.status_code == 404:
            result = {
                'count': 0,
                'blobs': [],
                'total_size': 0,
                'total_compressed_size': 0,
                'avg_compression_ratio': 0
            }
            return result
            
        raise Exception(f"Beacon node API returned an error: {str(e)}")
        
    except requests.exceptions.RequestException as e:
        print(f"Request error fetching blob sidecars for block {block_id}: {str(e)}")
        raise Exception(f"Failed to connect to beacon node: {str(e)}")
        
    except Exception as e:
        print(f"Unexpected error processing blob sidecars for block {block_id}: {str(e)}")
        raise Exception(f"Error processing blob data: {str(e)}")

def get_blobs_range(start_slot, end_slot):
    """
    Fetch blob sidecars for multiple blocks in the given slot range.
    
    Args:
        start_slot: Starting slot number
        end_slot: Ending slot number
    
    Returns:
        List of blob data dictionaries
    """
    results = []
    for slot in range(start_slot, end_slot + 1):
        try:
            blob_data = get_blob_sidecars(str(slot))
            # Add slot number to the result
            blob_data['slot'] = slot
            results.append(blob_data)
        except Exception as e:
            print(f"Error fetching blob sidecars at slot {slot}: {str(e)}")
            # Create a placeholder with only the slot number
            placeholder = {
                'slot': slot,
                'count': 0,
                'blobs': [],
                'total_size': 0,
                'total_compressed_size': 0,
                'avg_compression_ratio': 0,
                'error': str(e)
            }
            results.append(placeholder)
    
    return results

def get_excess_blob_gas(block_id):
    """
    Fetch excess blob gas for a specific block and calculate the blob base fee.
    
    Args:
        block_id: Can be 'head', a slot number, or a block root hash
    
    Returns:
        Dict with excess blob gas and calculated blob base fee in Gwei
    """
    # Constants for blob base fee calculation
    MAX_BLOB_GAS_PER_BLOCK = 786432
    TARGET_BLOB_GAS_PER_BLOCK = 393216
    MIN_BASE_FEE_PER_BLOB_GAS = 1
    BLOB_BASE_FEE_UPDATE_FRACTION = 3338477
    
    beacon_url = current_app.config['BEACON_NODE_URL']
    
    try:
        # Get JSON data with timeout
        response = requests.get(
            f"{beacon_url}/eth/v1/beacon/blocks/{block_id}",
            headers={"Accept": "application/json"},
            timeout=5  # 5 second timeout
        )
        
        response.raise_for_status()  # Raise exception for non-200 responses
        
        data = response.json()
        
        # Mock data for testing without a real beacon node or when in mock mode
        if shouldUseMockData():
            import random
            import math
            
            # Use deterministic but varying values based on block_id if it's a number
            if block_id.isdigit():
                # Use the block number to generate a pseudo-random but consistent value
                slot_num = int(block_id)
                # Create a wave pattern that varies with the slot number
                wave_position = slot_num % 12  # Create repeating pattern
                base_excess_gas = 200000 + 100000 * math.sin(wave_position * math.pi / 6)
                excess_blob_gas = int(base_excess_gas + ((slot_num % 50000) / 50000) * 400000)
                # Ensure within valid range
                excess_blob_gas = max(0, min(excess_blob_gas, MAX_BLOB_GAS_PER_BLOCK))
            else:
                # For non-numeric IDs, use random value
                excess_blob_gas = random.randint(0, MAX_BLOB_GAS_PER_BLOCK)
                
            # Calculate blob base fee in wei
            blob_base_fee_wei = MIN_BASE_FEE_PER_BLOB_GAS * math.exp(excess_blob_gas / BLOB_BASE_FEE_UPDATE_FRACTION)
            # Convert to Gwei and round to integer
            blob_base_fee_gwei = round(blob_base_fee_wei / 1e9)
            
            # Ensure the values are non-zero
            if blob_base_fee_gwei == 0 and excess_blob_gas > 0:
                # If the calculation rounds to zero, use a minimum value
                blob_base_fee_gwei = 1
            
            return {
                'slot': int(block_id) if block_id.isdigit() else 12345,
                'excess_blob_gas': excess_blob_gas,
                'blob_base_fee': blob_base_fee_gwei
            }
        
        # Extract excess_blob_gas from execution payload
        try:
            excess_blob_gas = int(data['data']['message']['body']['execution_payload']['excess_blob_gas'])
        except (KeyError, TypeError) as e:
            print(f"Error accessing excess_blob_gas in response structure: {str(e)}")
            # If we can't find excess_blob_gas in the expected location, search for it elsewhere
            # in the response or use a fallback value
            excess_blob_gas = search_for_excess_blob_gas(data) or TARGET_BLOB_GAS_PER_BLOCK
        
        # Calculate blob base fee
        import math
        # Calculate blob base fee in wei
        blob_base_fee_wei = MIN_BASE_FEE_PER_BLOB_GAS * math.exp(excess_blob_gas / BLOB_BASE_FEE_UPDATE_FRACTION)
        # Convert to Gwei and round to integer
        blob_base_fee_gwei = round(blob_base_fee_wei / 1e9)
        
        # Ensure the values are non-zero if excess_blob_gas is non-zero
        if blob_base_fee_gwei == 0 and excess_blob_gas > 0:
            # If the calculation rounds to zero, use a minimum value
            blob_base_fee_gwei = 1
        
        return {
            'slot': int(data['data']['message']['slot']),
            'excess_blob_gas': excess_blob_gas,
            'blob_base_fee': blob_base_fee_gwei
        }
        
    except requests.exceptions.Timeout:
        print(f"Timeout fetching excess blob gas for block {block_id} from beacon node")
        raise
    except Exception as e:
        print(f"Error fetching excess blob gas for block {block_id}: {str(e)}")
        raise

def search_for_excess_blob_gas(data):
    """
    Search for excess_blob_gas in the response data structure.
    Different beacon node implementations might have it in different locations.
    
    Args:
        data: The JSON response data
        
    Returns:
        excess_blob_gas value if found, otherwise None
    """
    # Try different potential locations based on different beacon node implementations
    try:
        # Location for some implementations
        return int(data['data']['message']['body']['execution_payload']['excess_blob_gas'])
    except (KeyError, TypeError):
        pass
    
    try:
        # Alternative location
        return int(data['data']['body']['execution_payload']['excess_blob_gas'])
    except (KeyError, TypeError):
        pass
        
    try:
        # Another possibility
        return int(data['message']['body']['execution_payload']['excess_blob_gas'])
    except (KeyError, TypeError):
        pass
    
    return None

def shouldUseMockData():
    """Check if we should use mock data"""
    # Check configuration from Flask app
    if hasattr(current_app, 'config') and 'USE_MOCK_DATA' in current_app.config:
        return current_app.config['USE_MOCK_DATA']
    return False

def get_blob_fees_range(start_slot, end_slot):
    """
    Fetch blob fees for multiple blocks in the given slot range.
    
    Args:
        start_slot: Starting slot number
        end_slot: Ending slot number
    
    Returns:
        List of blob fee data dictionaries
    """
    results = []
    for slot in range(start_slot, end_slot + 1):
        try:
            fee_data = get_excess_blob_gas(str(slot))
            results.append(fee_data)
        except Exception as e:
            print(f"Error fetching blob fees at slot {slot}: {str(e)}")
            # Create a placeholder with only the slot number
            placeholder = {
                'slot': slot,
                'excess_blob_gas': 0,
                'blob_base_fee': 0,
                'error': str(e)
            }
            results.append(placeholder)
    
    return results 