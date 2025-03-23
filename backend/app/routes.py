from flask import Blueprint, jsonify, request, current_app
import requests
import snappy
# import ssz
import time
from app.beacon_client import get_block, get_blocks_range

blocks_bp = Blueprint('blocks', __name__, url_prefix='/api')

@blocks_bp.route('/block/<block_id>', methods=['GET'])
def block(block_id):
    """Get block details, including SSZ and compressed sizes."""
    try:
        block_data = get_block(block_id)
        return jsonify(block_data)
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
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blocks_bp.route('/latest', methods=['GET'])
def latest():
    """Get the latest (head) block."""
    try:
        block_data = get_block('head')
        return jsonify(block_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 