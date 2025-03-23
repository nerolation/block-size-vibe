import requests
import snappy
from flask import current_app
import time
# import ssz
import json
from functools import lru_cache

# Simple in-memory cache to avoid redundant requests
block_cache = {}

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
                # Request execution payload SSZ separately if supported by API
                try:
                    payload_response = requests.get(
                        f"{beacon_url}/eth/v2/beacon/blocks/{block_id}/execution_payload",
                        headers={"Accept": "application/octet-stream"},
                        timeout=3
                    )
                    if payload_response.status_code == 200:
                        components['execution_payload'] = len(payload_response.content)
                    else:
                        # Fall back to estimation based on proportion
                        components['execution_payload'] = int(ssz_size * 0.65)  # ~65% of block size typically
                except:
                    # Fall back to estimation
                    components['execution_payload'] = int(ssz_size * 0.65)
            
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
            if total_component_size > ssz_size:
                # Scale down proportionally
                scale_factor = ssz_size / total_component_size
                for component in components:
                    components[component] = int(components[component] * scale_factor)
                    
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