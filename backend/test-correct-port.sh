#!/bin/bash

# Use the correct Python version
PYTHON_CMD="python3.10"
if ! command -v $PYTHON_CMD &> /dev/null; then
  # Try using pyenv to find the correct Python
  if command -v pyenv &> /dev/null; then
    PYTHON_CMD="$(pyenv which python)"
    echo "Using pyenv Python: $PYTHON_CMD"
  else
    echo "Error: Cannot find Python 3.10. Please install it or update this script."
    exit 1
  fi
fi

# Set environment variables directly
export BEACON_NODE_URL=http://localhost:5052/
export EXECUTION_NODE_URL=http://localhost:8545/

echo "Testing with local endpoints:"
echo "  Beacon API: $BEACON_NODE_URL"
echo "  Execution API: $EXECUTION_NODE_URL"

# Run the test script
$PYTHON_CMD test_api.py

# Print instructions for running the application
echo
echo "To run the application with these endpoints, use:"
echo "./run-with-correct-port.sh" 