import pytest
from app import create_app
import os
import json
import base64

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    app = create_app(test_config={'TESTING': True, 'BEACON_NODE_URL': 'http://localhost:5052'})
    yield app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def mock_block_json():
    """Sample block response in JSON format."""
    return {
        'data': {
            'message': {
                'slot': '123456',
                'body': {
                    'execution_payload': {'transactions': ['tx1', 'tx2']},
                    'attestations': ['att1', 'att2', 'att3'],
                    'deposits': [],
                    'proposer_slashings': [],
                    'attester_slashings': [],
                    'voluntary_exits': [],
                    'sync_aggregate': {'sync_committee_bits': '0x01', 'sync_committee_signature': '0x02'},
                    'blob_kzg_commitments': ['commitment1', 'commitment2']
                }
            },
            'root': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
    }

@pytest.fixture
def mock_ssz_bytes():
    """Sample SSZ-encoded block data."""
    # Creating a sample binary payload that's large enough to test compression
    return b''.join([bytes([i % 256]) * 1000 for i in range(30)])

@pytest.fixture
def mock_components_sizes():
    """Expected component sizes for the mock_block_json fixture."""
    return {
        'execution_payload': 28,
        'attestations': 24,
        'deposits': 2,
        'proposer_slashings': 2,
        'attester_slashings': 2,
        'voluntary_exits': 2,
        'sync_aggregate': 55,
        'blob_kzg_commitments': 31
    } 