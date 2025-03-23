import pytest
import time
from app.beacon_client import get_block
import requests

# This file contains integration tests that can be used when a beacon node is available
# Tests are marked as skip by default, but can be run manually with:
# pytest backend/tests/test_live_beacon.py -v --allow-live-api

def is_beacon_available():
    """Check if the beacon API is available at localhost:5052."""
    try:
        response = requests.get("http://localhost:5052/eth/v1/node/health", timeout=1)
        return response.status_code in (200, 206)
    except:
        return False

@pytest.mark.skipif(not is_beacon_available(), reason="Beacon API not available on localhost:5052")
class TestLiveBeacon:
    
    def test_live_get_head_block(self, app):
        """Test retrieving the head block from a live beacon node."""
        with app.app_context():
            try:
                block_data = get_block("head")
                
                # Verify the block has all the expected fields
                assert 'slot' in block_data
                assert 'ssz_size' in block_data
                assert 'snappy_size' in block_data
                assert 'compression_ratio' in block_data
                assert 'components' in block_data
                assert 'block_root' in block_data
                assert 'timestamp' in block_data
                
                # Check that SSZ size is reasonable (non-zero, not extremely large)
                assert block_data['ssz_size'] > 0
                assert block_data['ssz_size'] < 10 * 1024 * 1024  # Less than 10MB
                
                # Check that snappy size is reasonable and smaller than SSZ size
                assert block_data['snappy_size'] > 0
                assert block_data['snappy_size'] < block_data['ssz_size']
                
                # Check for components
                components = block_data['components']
                assert len(components) > 0
                
                # Rough check that the component sizes add up reasonably
                total_component_size = sum(components.values())
                assert total_component_size > 0
                
                # Check the execution payload is present (assuming post-merge)
                assert 'execution_payload' in components
                
                # Log the block details for debugging
                print(f"Retrieved head block at slot {block_data['slot']}")
                print(f"SSZ size: {block_data['ssz_size']} bytes")
                print(f"Snappy size: {block_data['snappy_size']} bytes")
                print(f"Compression ratio: {block_data['compression_ratio']}")
                
            except Exception as e:
                pytest.fail(f"Error retrieving head block: {str(e)}")
    
    @pytest.mark.skipif(not is_beacon_available(), reason="Beacon API not available on localhost:5052")
    def test_live_historical_block(self, app):
        """Test retrieving a historical block from a live beacon node."""
        with app.app_context():
            try:
                # Get the head block first to determine a good historical slot
                head_block = get_block("head")
                head_slot = head_block['slot']
                
                # Choose a slot 10 blocks back (if possible)
                historical_slot = max(0, head_slot - 10)
                
                # Get the historical block
                block_data = get_block(str(historical_slot))
                
                # Verify the block
                assert block_data['slot'] == historical_slot
                assert block_data['ssz_size'] > 0
                assert 0 < block_data['compression_ratio'] < 1.0
                assert len(block_data['components']) > 0
                
                # Log the details
                print(f"Retrieved historical block at slot {block_data['slot']}")
                print(f"SSZ size: {block_data['ssz_size']} bytes")
                
            except Exception as e:
                pytest.fail(f"Error retrieving historical block: {str(e)}")
    
    @pytest.mark.skipif(not is_beacon_available(), reason="Beacon API not available on localhost:5052")
    def test_live_component_sizes_are_reasonable(self, app):
        """Test that component sizes from a live beacon node are reasonable."""
        with app.app_context():
            try:
                # Get a block
                block_data = get_block("head")
                components = block_data['components']
                
                # Check we have components
                assert len(components) > 0
                
                # Verify execution payload exists and is reasonably sized
                assert 'execution_payload' in components
                assert components['execution_payload'] > 0
                
                # Calculate the percentage of each component
                total_size = block_data['ssz_size']
                for component, size in components.items():
                    percentage = (size / total_size) * 100
                    print(f"{component}: {size} bytes ({percentage:.2f}% of total)")
                    
                    # The component size can be larger than the total SSZ size
                    # This is because SSZ encoding is more compact than JSON
                    # and our component size calculations are based on JSON representations
                    # We just ensure no component is unreasonably large
                    assert percentage < 250
                
                # Total component size vs SSZ size
                total_component_size = sum(components.values())
                print(f"Total component size: {total_component_size} bytes")
                print(f"SSZ size: {total_size} bytes")
                ratio = total_component_size / total_size
                print(f"Ratio of component size to total size: {ratio:.2f}")
                
                # The component sizes are based on JSON encoding which is typically larger than SSZ
                # So the ratio can exceed 1.0, but shouldn't be too extreme
                assert ratio > 0.3
                # Upper bound is more lenient since JSON is less efficient than SSZ
                assert ratio < 5.0
                
            except Exception as e:
                pytest.fail(f"Error testing component sizes: {str(e)}")
    
    @pytest.mark.skipif(not is_beacon_available(), reason="Beacon API not available on localhost:5052")
    def test_live_size_consistency_across_requests(self, app):
        """Test that size calculations are consistent across multiple requests for the same block."""
        with app.app_context():
            try:
                # Get a specific slot from the recent past (not head)
                head_block = get_block("head")
                specific_slot = max(0, head_block['slot'] - 5)
                
                # Get the same block multiple times
                first_request = get_block(str(specific_slot))
                # Short sleep to ensure it's a completely new request
                time.sleep(1)
                second_request = get_block(str(specific_slot))
                
                # Verify the sizes are consistent
                assert first_request['ssz_size'] == second_request['ssz_size']
                assert first_request['snappy_size'] == second_request['snappy_size']
                assert first_request['compression_ratio'] == second_request['compression_ratio']
                
                # Verify component sizes are consistent
                for component in first_request['components']:
                    assert first_request['components'][component] == second_request['components'][component]
                
                print(f"Size consistency verified for block at slot {specific_slot}")
                
            except Exception as e:
                pytest.fail(f"Error testing size consistency: {str(e)}") 