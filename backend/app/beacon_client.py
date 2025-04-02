import requests
import snappy
from flask import current_app
import time
# import ssz
import json
from functools import lru_cache
import os
from urllib.parse import urlparse, urljoin
import random

# Constants for blob base fee calculation
MAX_BLOB_GAS_PER_BLOCK = 786432
TARGET_BLOB_GAS_PER_BLOCK = 393216
MIN_BASE_FEE_PER_BLOB_GAS = 1
BLOB_BASE_FEE_UPDATE_FRACTION = 3338477

# Simple in-memory cache to avoid redundant requests
block_cache = {}
blob_cache = {}
blob_fee_cache = {}

# Helper function to properly join URLs without double slashes
def join_url(base, path):
    """Join base URL and path, avoiding double slashes."""
    if not base.endswith('/'):
        base += '/'
    if path.startswith('/'):
        path = path[1:]
    return base + path

# Execution node URL - use app config
def get_execution_node_url():
    if hasattr(current_app, 'config') and 'EXECUTION_NODE_URL' in current_app.config:
        return current_app.config['EXECUTION_NODE_URL']
    return 'https://node.toniwahrstaetter.dev/execution/'

# Helper function to add API key to headers if available
def add_api_key_to_headers(headers):
    # Check if this is a local endpoint (don't need API key)
    beacon_url = current_app.config.get('BEACON_NODE_URL', '')
    if beacon_url.startswith('http://localhost:'):
        return headers
        
    # Add API key for non-local endpoints if available
    if current_app.config.get('X_API_KEY'):
        headers["X-API-Key"] = current_app.config['X_API_KEY']
    return headers

# Helper function for exponential backoff with jitter
def get_backoff_time(retry_count, base_delay=1, max_delay=10):
    # Exponential backoff: base_delay * 2^retry_count + random jitter
    delay = min(base_delay * (2 ** retry_count) + random.uniform(0, 0.5), max_delay)
    return delay

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
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Add API key if available
    headers = add_api_key_to_headers(headers)
    
    # Set up retry parameters
    max_retries = 2
    retry_count = 0
    
    while retry_count <= max_retries:
    try:
        response = requests.post(
            exec_url,
            json=payload,
                headers=headers,
                timeout=15  # 15 second timeout
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
                retry_count += 1
                print(f"Failed to get block from execution node: {response.status_code} (attempt {retry_count}/{max_retries+1})")
                
                if retry_count <= max_retries:
                    print(f"Retrying... ({retry_count}/{max_retries})")
                    time.sleep(get_backoff_time(retry_count))
                else:
                    print(f"All retries failed for execution node request")
                    return None
        
        except requests.exceptions.Timeout:
            retry_count += 1
            print(f"Timeout getting block from execution node (attempt {retry_count}/{max_retries+1})")
            
            if retry_count <= max_retries:
                print(f"Retrying... ({retry_count}/{max_retries})")
                time.sleep(get_backoff_time(retry_count))
            else:
                print(f"All retries failed for execution node request due to timeouts")
            return None
    
    except Exception as e:
            retry_count += 1
            print(f"Error getting block from execution node: {str(e)} (attempt {retry_count}/{max_retries+1})")
            
            if retry_count <= max_retries:
                print(f"Retrying... ({retry_count}/{max_retries})")
                time.sleep(get_backoff_time(retry_count))
            else:
                print(f"All retries failed for execution node request")
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
    
    # Setup headers
    headers = {"Accept": "application/json"}
    headers = add_api_key_to_headers(headers)
    
    # Set up retry parameters
    max_retries = 2
    retry_count = 0
    last_error = None
    
    while retry_count <= max_retries:
    try:
        # 1. Get JSON data with timeout
        json_response = requests.get(
                join_url(beacon_url, base_endpoint),
                headers=headers,
                timeout=15  # 15 second timeout
        )
        
        json_response.raise_for_status()  # Raise exception for non-200 responses
        
        json_data = json_response.json()
            
            # Update headers for SSZ request
            headers["Accept"] = "application/octet-stream"
        
        # 2. Get SSZ binary data with timeout
        ssz_response = requests.get(
                join_url(beacon_url, base_endpoint),
                headers=headers,
                timeout=15  # 15 second timeout
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
                            payload_headers = {"Accept": "application/octet-stream"}
                            payload_headers = add_api_key_to_headers(payload_headers)
                                
                        payload_response = requests.get(
                                join_url(beacon_url, f"/eth/v2/beacon/blocks/{block_id}/execution_payload"),
                                headers=payload_headers,
                                timeout=15
                        )
                        
                        if payload_response.status_code == 200:
                            # Got SSZ data directly
                            components['execution_payload'] = len(payload_response.content)
                            print(f"Got execution payload SSZ size: {components['execution_payload']} bytes")
                        else:
                            # Try to get the JSON data and estimate size better
                            try:
                                    json_payload_headers = {"Accept": "application/json"}
                                    json_payload_headers = add_api_key_to_headers(json_payload_headers)
                                        
                                json_payload_response = requests.get(
                                        join_url(beacon_url, f"/eth/v2/beacon/blocks/{block_id}/execution_payload"),
                                        headers=json_payload_headers,
                                        timeout=15
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
            retry_count += 1
            last_error = f"Timeout fetching block {block_id} from beacon node (attempt {retry_count}/{max_retries+1})"
            print(last_error)
            
            if retry_count <= max_retries:
                print(f"Retrying... ({retry_count}/{max_retries})")
                time.sleep(get_backoff_time(retry_count))
            else:
                print(f"All retries failed for block {block_id}")
                raise Exception(f"Beacon node API request timed out for block {block_id} after {max_retries+1} attempts")
        
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
    Fetch blob sidecars for a specific block.
    
    Args:
        block_id: Block identifier (slot number, 'head', or block root hash)
    
    Returns:
        Dict with blob size metrics and components
    """
    # Check cache first, but skip cache for 'head' requests to ensure we always get fresh data
    if block_id != 'head' and block_id in blob_cache:
        return blob_cache[block_id]
    
    beacon_url = current_app.config['BEACON_NODE_URL']
    
    # Setup headers
    headers = {"Accept": "application/json"}
    headers = add_api_key_to_headers(headers)
    
    try:
        # First, get all blob sidecars for the block
        response = requests.get(
            join_url(beacon_url, f"/eth/v1/beacon/blob_sidecars/{block_id}"),
            headers=headers,
            timeout=15
        )
        
        response.raise_for_status()
        data = response.json()
        blobs = data.get('data', [])
        
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
            print(f"Block {block_id} has no blob sidecars (404 response) - this is normal for blocks without blobs")
            result = {
                'count': 0,
                'blobs': [],
                'total_size': 0,
                'total_compressed_size': 0,
                'avg_compression_ratio': 0
            }
            
            # Cache the empty result
            if block_id != 'head':
                blob_cache[block_id] = result
                
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
    Get excess blob gas and calculate blob base fee for a specific block.
    
    Args:
        block_id: Block identifier (slot number, 'head', or block root hash)
    
    Returns:
        Dict with excess blob gas and blob base fee
    """
    # Check cache first, but skip cache for 'head' requests to ensure we always get fresh data
    if block_id != 'head' and block_id in blob_fee_cache:
        return blob_fee_cache[block_id]
    
    beacon_url = current_app.config['BEACON_NODE_URL']
    
    # Setup headers
    headers = {"Accept": "application/json"}
    headers = add_api_key_to_headers(headers)
    
    # Set up retry parameters
    max_retries = 2
    retry_count = 0
    last_error = None
    
    while retry_count <= max_retries:
        try:
            # Get block data
        response = requests.get(
                join_url(beacon_url, f"/eth/v2/beacon/blocks/{block_id}"),
                headers=headers,
                timeout=15
            )
            
            response.raise_for_status()
            data = response.json()
        
        # Extract excess_blob_gas from execution payload
        try:
            excess_blob_gas = int(data['data']['message']['body']['execution_payload']['excess_blob_gas'])
        except (KeyError, TypeError) as e:
            print(f"Error accessing excess_blob_gas in response structure: {str(e)}")
            # If we can't find excess_blob_gas in the expected location, search for it elsewhere
            # in the response or use a fallback value
                excess_blob_gas = TARGET_BLOB_GAS_PER_BLOCK
        
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
        
            result = {
            'slot': int(data['data']['message']['slot']),
            'excess_blob_gas': excess_blob_gas,
            'blob_base_fee': blob_base_fee_gwei
        }
        
            # Cache the result
            if block_id != 'head':
                blob_fee_cache[block_id] = result
                
            return result
            
    except requests.exceptions.Timeout:
            retry_count += 1
            last_error = f"Timeout fetching excess blob gas for block {block_id} from beacon node (attempt {retry_count}/{max_retries+1})"
            print(last_error)
            
            if retry_count <= max_retries:
                print(f"Retrying... ({retry_count}/{max_retries})")
                time.sleep(get_backoff_time(retry_count))
            else:
                # Return a default result for timeout cases
                print(f"All retries failed, returning default blob fee data for block {block_id}")
                result = {
                    'slot': int(block_id) if block_id.isdigit() else 0,
                    'excess_blob_gas': TARGET_BLOB_GAS_PER_BLOCK,  # Use target as default
                    'blob_base_fee': 1,  # Minimum blob base fee
                    'timeout': True  # Indicate this is a fallback
                }
                return result
                
    except Exception as e:
        print(f"Error fetching excess blob gas for block {block_id}: {str(e)}")
        raise

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
            # Create a placeholder with only the slot number and error information
            placeholder = {
                'slot': slot,
                'excess_blob_gas': None,
                'blob_base_fee': None,
                'error': str(e)
            }
            results.append(placeholder)
    
    return results 