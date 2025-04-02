#!/usr/bin/env python3
"""
A simple script to check if URLs are properly formatted
"""

import re
import urllib.parse
import argparse
import os
from dotenv import load_dotenv

def is_valid_url(url):
    """Check if a URL is valid"""
    try:
        result = urllib.parse.urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def check_trailing_slash(url):
    """Check if URL has trailing slash and add it if missing"""
    if not url.endswith('/'):
        return url + '/'
    return url

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Check Ethereum API endpoint URLs')
    parser.add_argument('--beacon-url', dest='beacon_url', help='URL of the Beacon Chain API endpoint')
    parser.add_argument('--execution-url', dest='execution_url', help='URL of the Execution Layer API endpoint')
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Get URLs from command line arguments or environment variables
    beacon_url = args.beacon_url or os.getenv('BEACON_NODE_URL')
    execution_url = args.execution_url or os.getenv('EXECUTION_NODE_URL')
    
    # Set default values
    default_beacon_url = 'https://example.com/beacon/'
    default_execution_url = 'https://example.com/execution/'
    
    # Check and fix beacon URL
    if not beacon_url:
        print(f"No beacon URL provided, using default: {default_beacon_url}")
        beacon_url = default_beacon_url
    elif not is_valid_url(beacon_url):
        print(f"Invalid beacon URL: {beacon_url}")
        print(f"Using default: {default_beacon_url}")
        beacon_url = default_beacon_url
    else:
        beacon_url = check_trailing_slash(beacon_url)
        print(f"Using beacon URL: {beacon_url}")
    
    # Check and fix execution URL
    if not execution_url:
        print(f"No execution URL provided, using default: {default_execution_url}")
        execution_url = default_execution_url
    elif not is_valid_url(execution_url):
        print(f"Invalid execution URL: {execution_url}")
        print(f"Using default: {default_execution_url}")
        execution_url = default_execution_url
    else:
        execution_url = check_trailing_slash(execution_url)
        print(f"Using execution URL: {execution_url}")
    
    return {
        'beacon_url': beacon_url,
        'execution_url': execution_url
    }

if __name__ == "__main__":
    urls = main()
    print("\nURL configurations:")
    print(f"BEACON_NODE_URL={urls['beacon_url']}")
    print(f"EXECUTION_NODE_URL={urls['execution_url']}") 