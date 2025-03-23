#!/usr/bin/env python3
import requests
import json
import math

# Test the blob base fee calculation
def test_blob_fee_calculation():
    # Constants from the standard
    MAX_BLOB_GAS_PER_BLOCK = 786432
    TARGET_BLOB_GAS_PER_BLOCK = 393216
    MIN_BASE_FEE_PER_BLOB_GAS = 1
    BLOB_BASE_FEE_UPDATE_FRACTION = 3338477
    
    # Test different excess_blob_gas values
    test_values = [0, 100000, 200000, 300000, 400000, 500000, 600000, 700000]
    
    print("\n===== Blob Base Fee Calculation Test =====")
    print(f"{'Excess Blob Gas':<15} | {'Base Fee (wei)':<20} | {'Base Fee (Gwei)':<20}")
    print("-" * 60)
    
    for excess_blob_gas in test_values:
        # Calculate base fee in wei
        base_fee_wei = MIN_BASE_FEE_PER_BLOB_GAS * math.exp(excess_blob_gas / BLOB_BASE_FEE_UPDATE_FRACTION)
        # Convert to Gwei
        base_fee_gwei = base_fee_wei / 1e9
        # Integer version (rounded)
        base_fee_gwei_int = round(base_fee_wei / 1e9)
        
        print(f"{excess_blob_gas:<15} | {base_fee_wei:<20.6f} | {base_fee_gwei:<10.6f} ({base_fee_gwei_int} as int)")

# Test the API endpoint
def test_api(base_url="http://localhost:5000/api"):
    try:
        # Test the health endpoint first
        resp = requests.get(f"{base_url.rstrip('/').split('/api')[0]}/health", timeout=2)
        if resp.status_code == 200:
            print(f"\n✅ Health check succeeded: {resp.text}")
        else:
            print(f"\n❌ Health check failed with status {resp.status_code}")
            
        # Test the blob-fee endpoint with mock data
        try:
            resp = requests.get(f"{base_url}/blob-fee/12345", timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                print(f"\n✅ Blob fee endpoint working")
                print(f"   Slot: {data.get('slot')}")
                print(f"   Excess blob gas: {data.get('excess_blob_gas')}")
                print(f"   Blob base fee: {data.get('blob_base_fee')} Gwei")
            else:
                print(f"\n❌ Blob fee endpoint failed with status {resp.status_code}")
        except Exception as e:
            print(f"\n❌ Error accessing blob fee endpoint: {str(e)}")
            
        # Test the blob-fees endpoint with mock data
        try:
            resp = requests.get(f"{base_url}/blob-fees?start=12345&end=12347", timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                print(f"\n✅ Blob fees range endpoint working, returned {len(data)} items")
                for item in data[:2]:  # Show first 2 items
                    print(f"   Slot: {item.get('slot')}, Base fee: {item.get('blob_base_fee')} Gwei")
            else:
                print(f"\n❌ Blob fees range endpoint failed with status {resp.status_code}")
        except Exception as e:
            print(f"\n❌ Error accessing blob fees range endpoint: {str(e)}")
    
    except Exception as e:
        print(f"\n❌ API test failed: {str(e)}")

if __name__ == "__main__":
    # Test the calculation first
    test_blob_fee_calculation()
    
    # Then test the API
    print("\n\n===== Testing API =====")
    test_api()
    
    print("\nTests complete!") 