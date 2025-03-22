import requests
import snappy
from flask import current_app
import time
import ssz
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
    # Check cache first
    if block_id in block_cache:
        return block_cache[block_id]
    
    beacon_url = current_app.config['BEACON_NODE_URL']
    base_endpoint = f"/eth/v2/beacon/blocks/{block_id}"
    
    # 1. Get JSON data
    json_response = requests.get(
        f"{beacon_url}{base_endpoint}",
        headers={"Accept": "application/json"}
    )
    
    if json_response.status_code != 200:
        raise Exception(f"Failed to fetch block JSON: {json_response.text}")
    
    json_data = json_response.json()
    
    # 2. Get SSZ binary data
    ssz_response = requests.get(
        f"{beacon_url}{base_endpoint}",
        headers={"Accept": "application/octet-stream"}
    )
    
    if ssz_response.status_code != 200:
        raise Exception(f"Failed to fetch block SSZ: {ssz_response.text}")
    
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
        # These are approximations since we don't re-encode each component
        if 'execution_payload' in body:
            components['execution_payload'] = len(json.dumps(body['execution_payload']).encode())
        
        if 'attestations' in body:
            components['attestations'] = len(json.dumps(body['attestations']).encode())
            
        if 'deposits' in body:
            components['deposits'] = len(json.dumps(body['deposits']).encode())
            
        if 'proposer_slashings' in body:
            components['proposer_slashings'] = len(json.dumps(body['proposer_slashings']).encode())
            
        if 'attester_slashings' in body:
            components['attester_slashings'] = len(json.dumps(body['attester_slashings']).encode())
            
        if 'voluntary_exits' in body:
            components['voluntary_exits'] = len(json.dumps(body['voluntary_exits']).encode())
            
        if 'sync_aggregate' in body:
            components['sync_aggregate'] = len(json.dumps(body['sync_aggregate']).encode())
            
        if 'blob_kzg_commitments' in body:
            components['blob_kzg_commitments'] = len(json.dumps(body['blob_kzg_commitments']).encode())
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
    
    # Cache the result (limited to 100 blocks)
    if len(block_cache) >= 100:
        oldest_key = next(iter(block_cache))
        del block_cache[oldest_key]
    block_cache[block_id] = result
    
    return result

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
            # Skip failed blocks but continue
            continue
    
    return results 