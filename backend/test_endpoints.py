#!/usr/bin/env python3
"""
Test script to verify beacon and execution endpoints with API keys
"""

import requests
import argparse
import os
from dotenv import load_dotenv

def test_beacon_endpoint(url, api_key=None):
    """Test the beacon endpoint"""
    print(f"Testing beacon endpoint: {url}")
    
    headers = {}
    if api_key:
        headers["X-API-Key"] = api_key
    
    try:
        response = requests.get(
            f"{url}/eth/v1/node/identity",
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Beacon endpoint test: SUCCESS")
            print(f"Node identity: {data.get('data', {}).get('peer_id', 'Unknown')}")
            return True
        else:
            print(f"Beacon endpoint test: FAILED with status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Beacon endpoint test: ERROR - {str(e)}")
        return False

def test_execution_endpoint(url, api_key=None):
    """Test the execution endpoint"""
    print(f"Testing execution endpoint: {url}")
    
    headers = {
        "Content-Type": "application/json"
    }
    if api_key:
        headers["X-API-Key"] = api_key
    
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_syncing",
        "params": [],
        "id": 1
    }
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print("Execution endpoint test: SUCCESS")
            print(f"Sync status: {data}")
            return True
        else:
            print(f"Execution endpoint test: FAILED with status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Execution endpoint test: ERROR - {str(e)}")
        return False

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Test Ethereum API endpoints')
    parser.add_argument('--beacon-url', dest='beacon_url', help='URL of the Beacon Chain API endpoint')
    parser.add_argument('--execution-url', dest='execution_url', help='URL of the Execution Layer API endpoint')
    parser.add_argument('--api-key', dest='api_key', help='API key for accessing the endpoints')
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Get URLs from arguments or environment variables with fallbacks
    beacon_url = args.beacon_url or os.getenv('BEACON_NODE_URL', 'https://example.com/beacon/')
    execution_url = args.execution_url or os.getenv('EXECUTION_NODE_URL', 'https://example.com/execution/')
    api_key = args.api_key or os.getenv('X_API_KEY', 'default-example-api-key-for-development')
    
    print("=== Testing Ethereum API Endpoints ===")
    print(f"Beacon URL: {beacon_url}")
    print(f"Execution URL: {execution_url}")
    print(f"API Key: {'Set' if api_key else 'Not set'}")
    print("=====================================")
    
    beacon_success = test_beacon_endpoint(beacon_url, api_key)
    execution_success = test_execution_endpoint(execution_url, api_key)
    
    print("=====================================")
    print(f"Beacon endpoint test: {'SUCCESS' if beacon_success else 'FAILED'}")
    print(f"Execution endpoint test: {'SUCCESS' if execution_success else 'FAILED'}")
    
    if beacon_success and execution_success:
        print("All tests passed! Endpoints are configured correctly.")
        return 0
    else:
        print("Some tests failed. Please check your endpoint configuration.")
        return 1

if __name__ == "__main__":
    exit(main())
