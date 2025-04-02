#!/usr/bin/env python3
"""
Test script for API endpoints
"""

import requests
import sys
import os
import argparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def parse_args():
    parser = argparse.ArgumentParser(description='Test API endpoints')
    parser.add_argument('--use-local', action='store_true', help='Use local endpoints (localhost:5052 for beacon, localhost:8585 for execution)')
    return parser.parse_args()

# Parse command line arguments
args = parse_args()

# Configuration
API_BASE_URL = "http://localhost:5000/api"  # Use local API server

# Use local endpoints if --use-local flag is provided
if args.use_local:
    BEACON_NODE_URL = 'http://localhost:5052/'
    EXECUTION_NODE_URL = 'http://localhost:8585/'
    API_KEY = None
    print("Using local endpoints")
else:
    BEACON_NODE_URL = os.getenv('BEACON_NODE_URL', 'https://example.com/beacon/')
    EXECUTION_NODE_URL = os.getenv('EXECUTION_NODE_URL', 'https://example.com/execution/')
    API_KEY = os.getenv('X_API_KEY', 'default-example-api-key-for-development')

# Set up headers
headers = {
    "Content-Type": "application/json"
}
if API_KEY:
    headers["X-API-Key"] = API_KEY

def test_endpoint(endpoint_url, method="GET", params=None, expected_status=200):
    """Test an API endpoint and return whether it succeeded"""
    print(f"Testing {method} {endpoint_url}")
    try:
        if method == "GET":
            response = requests.get(endpoint_url, params=params, headers=headers, timeout=20)
        else:
            response = requests.post(endpoint_url, json=params, headers=headers, timeout=20)
        
        if response.status_code == expected_status:
            print(f"✅ Success ({response.status_code})")
            # Print a sample of the response
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    print(f"Sample response: {str(response.json())[:200]}...")
                except:
                    print(f"Response is not JSON decodable: {response.text[:100]}...")
            return True
        else:
            print(f"❌ Failed with status code: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_direct_node_access():
    """Test direct access to the beacon and execution nodes"""
    print("\nTesting direct access to nodes:")
    print("-" * 50)
    
    # Test beacon node
    beacon_success = test_endpoint(f"{BEACON_NODE_URL}eth/v1/node/identity")
    
    # Test execution node
    exec_headers = {
        "Content-Type": "application/json"
    }
    if API_KEY:
        exec_headers["X-API-Key"] = API_KEY
        
    try:
        exec_response = requests.post(
            EXECUTION_NODE_URL,
            json={"jsonrpc": "2.0", "method": "eth_syncing", "params": [], "id": 1},
            headers=exec_headers,
            timeout=10
        )
        if exec_response.status_code == 200:
            print(f"✅ Execution node success ({exec_response.status_code})")
            print(f"Sample response: {exec_response.text[:200]}...")
            exec_success = True
        else:
            print(f"❌ Execution node failed with status code: {exec_response.status_code}")
            print(f"Response: {exec_response.text[:200]}")
            exec_success = False
    except Exception as e:
        print(f"❌ Execution node error: {str(e)}")
        exec_success = False
        
    return beacon_success, exec_success

def main():
    """Run the tests"""
    print(f"Testing API endpoints at {API_BASE_URL}")
    print(f"Using Beacon Node: {BEACON_NODE_URL}")
    print(f"Using Execution Node: {EXECUTION_NODE_URL}")
    print(f"API Key: {'Configured' if API_KEY else 'Not configured'}")
    print(f"Endpoint Type: {'Local' if args.use_local else 'Remote (Cloudflare)'}")
    print("=" * 50)
    
    # Test direct node access first
    beacon_direct, exec_direct = test_direct_node_access()
    
    # Test API health endpoint
    health_success = test_endpoint("http://localhost:5000/health")
    
    # Define endpoints to test
    endpoints = [
        ("/latest", "GET", None),
        ("/block/head", "GET", None),
        ("/blocks", "GET", {"start": 11374540, "end": 11374545}),
        ("/blob/head", "GET", None),
        ("/blobs", "GET", {"start": 11374540, "end": 11374545}),
        ("/blob-fee/head", "GET", None),
        ("/blob-fees", "GET", {"start": 11374540, "end": 11374545})
    ]
    
    # Test all endpoints
    results = []
    for endpoint, method, params in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        success = test_endpoint(url, method, params)
        results.append((endpoint, success))
    
    # Print summary
    print("\nSummary:")
    print("=" * 50)
    print(f"Direct Beacon Node access: {'✅ Success' if beacon_direct else '❌ Failed'}")
    print(f"Direct Execution Node access: {'✅ Success' if exec_direct else '❌ Failed'}")
    print(f"Health endpoint: {'✅ Success' if health_success else '❌ Failed'}")
    
    all_success = health_success
    for endpoint, success in results:
        print(f"{endpoint}: {'✅ Success' if success else '❌ Failed'}")
        all_success = all_success and success
    
    if all_success:
        print("\nAll endpoints are working! ✅")
        return 0
    else:
        print("\nSome endpoints failed! ❌")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 