from app import create_app
from dotenv import load_dotenv
import os
import argparse

# Parse command line arguments
parser = argparse.ArgumentParser(description='Run the Ethereum Block Size API server')
parser.add_argument('--beacon-url', dest='beacon_url', help='URL of the Beacon Chain API endpoint')
parser.add_argument('--execution-url', dest='execution_url', help='URL of the Execution Layer API endpoint')
parser.add_argument('--api-key', dest='api_key', help='API key for accessing the endpoints')
parser.add_argument('--port', dest='port', type=int, help='Port to run the API server on')
parser.add_argument('--use-local', dest='use_local', action='store_true', help='Use local endpoints (localhost:5052 for beacon, localhost:8545 for execution)')
args = parser.parse_args()

# Load environment variables from .env file if present
load_dotenv()

# Override environment variables with command line arguments if provided
if args.beacon_url:
    os.environ['BEACON_NODE_URL'] = args.beacon_url
if args.execution_url:
    os.environ['EXECUTION_NODE_URL'] = args.execution_url
if args.api_key:
    os.environ['X_API_KEY'] = args.api_key

# Use local endpoints if --use-local flag is provided
if args.use_local:
    os.environ['BEACON_NODE_URL'] = 'http://localhost:5052/'
    os.environ['EXECUTION_NODE_URL'] = 'http://localhost:8545/'
    print("Using local endpoints:")
    print("  Beacon API: http://localhost:5052/")
    print("  Execution API: http://localhost:8545/")
    # No API key needed for local endpoints
    os.environ.pop('X_API_KEY', None)

app = create_app()

if __name__ == '__main__':
    port = args.port or int(os.environ.get('PORT', 5000))
    app.run(
        host='0.0.0.0', 
        port=port, 
        debug=os.environ.get('FLASK_ENV') == 'development'
    ) 