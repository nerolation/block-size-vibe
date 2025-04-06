#!/bin/bash
set -e

# Set the external endpoints
export BEACON_NODE_URL="https://your-beacon-node-provider.example/"
export EXECUTION_NODE_URL="https://your-execution-node-provider.example/"

echo "Using external endpoints in test script:"
echo "  Beacon Node: $BEACON_NODE_URL"
echo "  Execution Node: $EXECUTION_NODE_URL"

# Determine if sudo is needed
DOCKER_CMD="docker-compose"
if ! docker info > /dev/null 2>&1; then
    echo "Docker requires elevated privileges. Using sudo..."
    DOCKER_CMD="sudo docker-compose"
fi

# Clean up everything first
echo "Cleaning up existing Docker resources..."
$DOCKER_CMD down --remove-orphans || true
docker system prune -f || true

# Start with a full rebuild
echo "Starting with rebuild..."
$DOCKER_CMD up --build --force-recreate 