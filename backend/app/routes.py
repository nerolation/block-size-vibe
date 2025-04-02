from flask import Blueprint, jsonify, request, current_app
import requests
import snappy
# import ssz
import time
from app.beacon_client import get_block, get_blocks_range, get_blob_sidecars, get_blobs_range, get_excess_blob_gas, get_blob_fees_range

blocks_bp = Blueprint('blocks', __name__, url_prefix='/api')

@blocks_bp.route('/block/<block_id>', methods=['GET'])
def block(block_id):
    """Get block details, including SSZ and compressed sizes."""
    try:
        block_data = get_block(block_id)
        return jsonify(block_data)
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request to Ethereum node timed out. The node might be busy or experiencing network issues.',
            'detail': f'Timed out while requesting block data for {block_id}'
        }), 504  # Gateway Timeout
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blocks_bp.route('/blocks', methods=['GET'])
def blocks():
    """Get multiple blocks in a slot range."""
    try:
        start_slot = request.args.get('start', type=int)
        end_slot = request.args.get('end', type=int)
        
        if not start_slot or not end_slot:
            return jsonify({'error': 'start and end slots are required'}), 400
            
        if end_slot - start_slot > 100:
            return jsonify({'error': 'Maximum range is 100 slots'}), 400
            
        blocks_data = get_blocks_range(start_slot, end_slot)
        return jsonify(blocks_data)
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request to Ethereum node timed out. The node might be busy or experiencing network issues.',
            'detail': f'Timed out while requesting blocks data from {start_slot} to {end_slot}'
        }), 504  # Gateway Timeout
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blocks_bp.route('/latest', methods=['GET'])
def latest():
    """Get the latest (head) block."""
    try:
        block_data = get_block('head')
        return jsonify(block_data)
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request to Ethereum node timed out. The node might be busy or experiencing network issues.',
            'detail': 'Timed out while requesting latest block data'
        }), 504  # Gateway Timeout
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blocks_bp.route('/blob/<block_id>', methods=['GET'])
def blob(block_id):
    """Get blob sidecars for a specific block."""
    try:
        blob_data = get_blob_sidecars(block_id)
        return jsonify(blob_data)
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request to Ethereum node timed out. The node might be busy or experiencing network issues.',
            'detail': f'Timed out while requesting blob data for {block_id}'
        }), 504  # Gateway Timeout
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blocks_bp.route('/blobs', methods=['GET'])
def blobs():
    """Get blob sidecars for multiple blocks in a slot range."""
    try:
        start_slot = request.args.get('start', type=int)
        end_slot = request.args.get('end', type=int)
        
        if not start_slot or not end_slot:
            return jsonify({'error': 'start and end slots are required'}), 400
            
        if end_slot - start_slot > 100:
            return jsonify({'error': 'Maximum range is 100 slots'}), 400
            
        blobs_data = get_blobs_range(start_slot, end_slot)
        return jsonify(blobs_data)
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request to Ethereum node timed out. The node might be busy or experiencing network issues.',
            'detail': f'Timed out while requesting blobs data from {start_slot} to {end_slot}'
        }), 504  # Gateway Timeout
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blocks_bp.route('/blob-fee/<block_id>', methods=['GET'])
def blob_fee(block_id):
    """Get excess blob gas and blob base fee for a specific block."""
    try:
        fee_data = get_excess_blob_gas(block_id)
        return jsonify(fee_data)
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request to Ethereum node timed out. The node might be busy or experiencing network issues.',
            'detail': f'Timed out while requesting blob fee data for {block_id}'
        }), 504  # Gateway Timeout
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blocks_bp.route('/blob-fees', methods=['GET'])
def blob_fees():
    """Get excess blob gas and blob base fee for multiple blocks in a slot range."""
    try:
        start_slot = request.args.get('start', type=int)
        end_slot = request.args.get('end', type=int)
        
        if not start_slot or not end_slot:
            return jsonify({'error': 'start and end slots are required'}), 400
            
        if end_slot - start_slot > 100:
            return jsonify({'error': 'Maximum range is 100 slots'}), 400
            
        fees_data = get_blob_fees_range(start_slot, end_slot)
        return jsonify(fees_data)
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Request to Ethereum node timed out. The node might be busy or experiencing network issues.',
            'detail': f'Timed out while requesting blob fees data from {start_slot} to {end_slot}'
        }), 504  # Gateway Timeout
    except Exception as e:
        return jsonify({'error': str(e)}), 500 