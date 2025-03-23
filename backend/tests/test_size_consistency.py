import pytest
import json
import snappy
import random
import string
from app.beacon_client import get_block
from unittest.mock import patch

def generate_random_hex(length):
    """Generate random hex string of specified length."""
    return '0x' + ''.join(random.choice(string.hexdigits) for _ in range(length))

def generate_random_transaction(size_range=(1000, 5000)):
    """Generate a random transaction with specified size range."""
    size = random.randint(*size_range)
    return {
        'data': generate_random_hex(size),
        'gas': str(random.randint(21000, 1000000)),
        'gas_price': str(random.randint(1, 100)) + '000000000',
        'hash': generate_random_hex(64),
        'from': generate_random_hex(40),
        'to': generate_random_hex(40),
        'value': str(random.randint(0, 10)) + '000000000000000000'
    }

def generate_random_attestation():
    """Generate a random attestation."""
    return {
        'aggregation_bits': '0x' + ''.join(random.choice(['0', '1']) for _ in range(64)),
        'data': {
            'slot': str(random.randint(1, 1000000)),
            'index': str(random.randint(0, 63)),
            'beacon_block_root': generate_random_hex(64),
            'source': {
                'epoch': str(random.randint(1, 10000)),
                'root': generate_random_hex(64)
            },
            'target': {
                'epoch': str(random.randint(1, 10000)),
                'root': generate_random_hex(64)
            }
        },
        'signature': generate_random_hex(192)
    }

def generate_mock_block_data(num_transactions=10, num_attestations=64):
    """Generate a realistic mock block with controlled component sizes."""
    transactions = [generate_random_transaction() for _ in range(num_transactions)]
    attestations = [generate_random_attestation() for _ in range(num_attestations)]
    
    return {
        'data': {
            'message': {
                'slot': str(random.randint(1, 1000000)),
                'proposer_index': str(random.randint(0, 1000)),
                'parent_root': generate_random_hex(64),
                'state_root': generate_random_hex(64),
                'body': {
                    'randao_reveal': generate_random_hex(96),
                    'eth1_data': {
                        'deposit_root': generate_random_hex(64),
                        'deposit_count': str(random.randint(1, 10000)),
                        'block_hash': generate_random_hex(64)
                    },
                    'graffiti': generate_random_hex(64),
                    'proposer_slashings': [],
                    'attester_slashings': [],
                    'attestations': attestations,
                    'deposits': [],
                    'voluntary_exits': [],
                    'sync_aggregate': {
                        'sync_committee_bits': '0x' + ''.join(random.choice(['0', '1', '2', 'f']) for _ in range(64)),
                        'sync_committee_signature': generate_random_hex(192)
                    },
                    'execution_payload': {
                        'parent_hash': generate_random_hex(64),
                        'fee_recipient': generate_random_hex(40),
                        'state_root': generate_random_hex(64),
                        'receipts_root': generate_random_hex(64),
                        'logs_bloom': generate_random_hex(512),
                        'prev_randao': generate_random_hex(64),
                        'block_number': str(random.randint(1, 1000000)),
                        'gas_limit': str(30000000),
                        'gas_used': str(random.randint(1000000, 30000000)),
                        'timestamp': str(int(random.random() * 1000000000) + 1600000000),
                        'extra_data': generate_random_hex(64),
                        'base_fee_per_gas': str(random.randint(1, 100)) + '000000000',
                        'block_hash': generate_random_hex(64),
                        'transactions': transactions
                    },
                    'blob_kzg_commitments': [generate_random_hex(100) for _ in range(random.randint(0, 6))]
                }
            },
            'root': generate_random_hex(64),
            'signature': generate_random_hex(192)
        }
    }

class TestSizeConsistency:

    def test_component_sizes_add_up(self, app, requests_mock):
        """
        Test that the sum of component sizes is reasonably close to the total block size.
        This is a critical test for size reporting accuracy.
        """
        with app.app_context():
            # Generate a realistic mock block with controlled components
            mock_block_json = generate_mock_block_data(num_transactions=50, num_attestations=128)
            
            # Create a binary representation as if it were SSZ encoded
            mock_ssz_bytes = json.dumps(mock_block_json).encode()
            
            # Mock the API responses
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/test_block",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/json',
                json=mock_block_json
            )
            
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/test_block",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/octet-stream',
                content=mock_ssz_bytes
            )
            
            # Get the block
            block_data = get_block("test_block")
            
            # Check that the component sizes were calculated
            components = block_data['components']
            assert len(components) > 0
            
            # Calculate the total component size
            total_component_size = sum(components.values())
            
            # The total component size should be within a reasonable margin of the SSZ size
            # We validate it's at least 50% - this is a loose check because JSON encoding vs SSZ encoding
            # will have significant differences, but the relative proportions should be sensible
            assert total_component_size >= 0.5 * block_data['ssz_size']
            
            # More importantly, check that the relative sizes of components make sense
            # Execution payload should be the largest component if transactions are included
            if 'execution_payload' in components and components['execution_payload'] > 0:
                assert components['execution_payload'] > components.get('attestations', 0)
            
            # If attestations are included, they should be significant
            if 'attestations' in components and components['attestations'] > 0:
                assert components['attestations'] > components.get('sync_aggregate', 0)
    
    def test_consistent_component_sizing_algorithm(self, app, requests_mock):
        """
        Test that component size calculations are consistent when the same data is processed multiple times.
        """
        with app.app_context():
            # Generate mock data
            mock_block_json = generate_mock_block_data()
            mock_ssz_bytes = json.dumps(mock_block_json).encode()
            
            # Mock the API responses
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/consistency_test",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/json',
                json=mock_block_json
            )
            
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/consistency_test",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/octet-stream',
                content=mock_ssz_bytes
            )
            
            # Get the block multiple times and check for consistent results
            first_result = get_block("consistency_test")
            
            # Clear the cache to force recalculation
            with patch('app.beacon_client.block_cache', {}):
                second_result = get_block("consistency_test")
            
            # The component sizes should be identical across calls
            assert first_result['components'] == second_result['components']
            
            # The compression ratio should also be identical
            assert first_result['compression_ratio'] == second_result['compression_ratio']
    
    def test_snappy_compression_ratio(self, app, requests_mock):
        """
        Test that the compression ratio is calculated correctly and reasonably.
        """
        with app.app_context():
            # Generate mock data with high and low compression potential
            # Highly compressible data: repeating sequences
            repeating_data = b'abcdefghij' * 10000
            compressed_repeating = snappy.compress(repeating_data)
            
            # Low compression data: random bytes
            random_data = bytes(random.randint(0, 255) for _ in range(100000))
            compressed_random = snappy.compress(random_data)
            
            # Verify basic compression logic
            assert len(compressed_repeating) < len(repeating_data)
            # Random data shouldn't compress as well
            assert len(compressed_random) / len(random_data) > len(compressed_repeating) / len(repeating_data)
            
            # Test with a realistic block example
            mock_block_json = generate_mock_block_data(num_transactions=20, num_attestations=64)
            mock_ssz_bytes = json.dumps(mock_block_json).encode()
            
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/compression_test",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/json',
                json=mock_block_json
            )
            
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/compression_test",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/octet-stream',
                content=mock_ssz_bytes
            )
            
            # Get the block
            block_data = get_block("compression_test")
            
            # Check compression ratio
            assert 0 < block_data['compression_ratio'] < 1.0
            expected_ratio = len(snappy.compress(mock_ssz_bytes)) / len(mock_ssz_bytes)
            assert abs(block_data['compression_ratio'] - expected_ratio) < 0.0001  # Very close match

    def test_component_size_proportions(self, app, requests_mock):
        """
        Test that component size proportions are reasonable and consistent with expectations.
        """
        with app.app_context():
            # Test case 1: block with mostly transactions
            tx_heavy_block = generate_mock_block_data(num_transactions=100, num_attestations=10)
            tx_heavy_ssz = json.dumps(tx_heavy_block).encode()
            
            # Test case 2: block with mostly attestations
            att_heavy_block = generate_mock_block_data(num_transactions=5, num_attestations=200)
            att_heavy_ssz = json.dumps(att_heavy_block).encode()
            
            # Mock API responses for both blocks
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/tx_heavy",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/json',
                json=tx_heavy_block
            )
            
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/tx_heavy",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/octet-stream',
                content=tx_heavy_ssz
            )
            
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/att_heavy",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/json',
                json=att_heavy_block
            )
            
            requests_mock.get(
                "http://localhost:5052/eth/v2/beacon/blocks/att_heavy",
                additional_matcher=lambda request: request.headers.get('Accept') == 'application/octet-stream',
                content=att_heavy_ssz
            )
            
            # Get the blocks
            tx_heavy_data = get_block("tx_heavy")
            att_heavy_data = get_block("att_heavy")
            
            # Verify component proportions
            assert tx_heavy_data['components']['execution_payload'] > tx_heavy_data['components']['attestations']
            assert att_heavy_data['components']['attestations'] > att_heavy_data['components']['execution_payload'] 