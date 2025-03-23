import pytest
import json
from unittest.mock import patch

class TestRoutes:

    def test_get_block_endpoint(self, client, mock_block_json, mock_ssz_bytes):
        """Test the /api/block/<block_id> endpoint."""
        
        with patch('app.routes.get_block') as mock_get_block:
            # Set up the mock return value
            mock_get_block.return_value = {
                'slot': 123456,
                'ssz_size': 30000,
                'snappy_size': 15000,
                'compression_ratio': 0.5,
                'components': {
                    'execution_payload': 20000,
                    'attestations': 5000,
                    'deposits': 0,
                    'proposer_slashings': 0,
                    'attester_slashings': 0,
                    'voluntary_exits': 0,
                    'sync_aggregate': 1000,
                    'blob_kzg_commitments': 4000
                },
                'block_root': '0x1234567890abcdef',
                'timestamp': 1647270000
            }
            
            # Make the request
            response = client.get('/api/block/123456')
            
            # Check if the request was successful
            assert response.status_code == 200
            
            # Parse the response data
            data = json.loads(response.data)
            
            # Verify the response structure
            assert data['slot'] == 123456
            assert data['ssz_size'] == 30000
            assert data['snappy_size'] == 15000
            assert data['compression_ratio'] == 0.5
            assert 'components' in data
            assert data['block_root'] == '0x1234567890abcdef'
            
            # Verify that the components all exist
            components = data['components']
            expected_components = [
                'execution_payload', 'attestations', 'deposits', 'proposer_slashings',
                'attester_slashings', 'voluntary_exits', 'sync_aggregate', 'blob_kzg_commitments'
            ]
            for component in expected_components:
                assert component in components
                
            # Verify that the total component size is consistent with the overall size
            total_component_size = sum(components.values())
            assert total_component_size == 30000
    
    def test_get_blocks_endpoint(self, client):
        """Test the /api/blocks endpoint with slot range parameters."""
        
        with patch('app.routes.get_blocks_range') as mock_get_blocks_range:
            # Set up the mock return value with consistent component sizes
            mock_get_blocks_range.return_value = [
                {
                    'slot': 100,
                    'ssz_size': 25000,  # Adjusted to match component totals
                    'snappy_size': 15000,
                    'compression_ratio': 0.6,
                    'components': {'execution_payload': 20000, 'attestations': 5000},
                    'block_root': '0xblock100',
                    'timestamp': 1647270000
                },
                {
                    'slot': 101,
                    'ssz_size': 27000,  # Adjusted to match component totals
                    'snappy_size': 16000,
                    'compression_ratio': 0.59,
                    'components': {'execution_payload': 22000, 'attestations': 5000},
                    'block_root': '0xblock101',
                    'timestamp': 1647270001
                }
            ]
            
            # Make the request
            response = client.get('/api/blocks?start=100&end=101')
            
            # Check if the request was successful
            assert response.status_code == 200
            
            # Parse the response data
            data = json.loads(response.data)
            
            # Verify the response structure
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]['slot'] == 100
            assert data[1]['slot'] == 101
            
            # Verify that each block has the expected structure
            for block in data:
                assert 'ssz_size' in block
                assert 'snappy_size' in block
                assert 'compression_ratio' in block
                assert 'components' in block
                assert 'block_root' in block
                assert 'timestamp' in block
                
                # Check that component sizes add up to the total
                total_component_size = sum(block['components'].values())
                assert total_component_size == block['ssz_size']
    
    def test_get_blocks_validation(self, client):
        """Test validation for the /api/blocks endpoint."""
        
        # Test missing parameters
        response = client.get('/api/blocks')
        assert response.status_code == 400
        
        # Test missing end parameter
        response = client.get('/api/blocks?start=100')
        assert response.status_code == 400
        
        # Test missing start parameter
        response = client.get('/api/blocks?end=101')
        assert response.status_code == 400
        
        # Test range too large
        response = client.get('/api/blocks?start=100&end=201')  # 101 slots
        assert response.status_code == 400
    
    def test_latest_block_endpoint(self, client):
        """Test the /api/latest endpoint."""
        
        with patch('app.routes.get_block') as mock_get_block:
            # Set up the mock return value
            mock_get_block.return_value = {
                'slot': 999999,
                'ssz_size': 30000,
                'snappy_size': 15000,
                'compression_ratio': 0.5,
                'components': {'execution_payload': 20000, 'attestations': 5000},
                'block_root': '0xlatestblock',
                'timestamp': 1647270000
            }
            
            # Make the request
            response = client.get('/api/latest')
            
            # Check if the request was successful
            assert response.status_code == 200
            
            # Parse the response data
            data = json.loads(response.data)
            
            # Verify the response structure
            assert data['slot'] == 999999
            assert 'ssz_size' in data
            assert 'snappy_size' in data
            assert 'compression_ratio' in data
            assert 'components' in data
            assert data['block_root'] == '0xlatestblock'
            
            # Verify that mock_get_block was called with 'head'
            mock_get_block.assert_called_once_with('head')
    
    def test_error_handling(self, client):
        """Test error handling in the API endpoints."""
        
        with patch('app.routes.get_block', side_effect=Exception('Test error')):
            # Test error handling in /api/block endpoint
            response = client.get('/api/block/123456')
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data
            
            # Test error handling in /api/latest endpoint
            response = client.get('/api/latest')
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data
        
        with patch('app.routes.get_blocks_range', side_effect=Exception('Test error')):
            # Test error handling in /api/blocks endpoint
            response = client.get('/api/blocks?start=100&end=101')
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data 