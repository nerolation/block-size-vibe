#!/bin/bash
set -e

# Store the external endpoints - replace with your own endpoints
EXECUTION_NODE_URL="https://your-execution-node-provider.example/"
BEACON_NODE_URL="https://your-beacon-node-provider.example/"

# Export them as environment variables
export EXECUTION_NODE_URL
export BEACON_NODE_URL

echo "Using external endpoints:"
echo "  Execution Node: $EXECUTION_NODE_URL"
echo "  Beacon Node: $BEACON_NODE_URL"

# Make sure the .env file has the correct values
cat > .env << EOL
# Blockchain Node URLs
BEACON_NODE_URL=${BEACON_NODE_URL}
EXECUTION_NODE_URL=${EXECUTION_NODE_URL}

# API Key (if required by your node provider)
X_API_KEY=

# Frontend config
NEXT_PUBLIC_API_URL=http://localhost:5000
EOL

# Check if Docker is running and available
if ! docker info > /dev/null 2>&1; then
    echo "Docker daemon is not accessible. You may need to:"
    echo "1. Start Docker service: sudo systemctl start docker"
    echo "2. Add your user to the docker group: sudo usermod -aG docker $USER"
    echo "3. Log out and log back in for group changes to take effect"
    echo "4. Or run this script with sudo"
    
    echo -e "\nWould you like to continue with sudo? (y/n) [y]"
    read use_sudo
    use_sudo=${use_sudo:-y}
    
    if [[ "$use_sudo" =~ ^[Yy]$ ]]; then
        DOCKER_CMD="sudo docker-compose"
    else
        echo "Exiting. Please fix Docker permissions and try again."
        exit 1
    fi
else
    DOCKER_CMD="docker-compose"
fi

# Clean up any old containers first to avoid the ContainerConfig error
echo "Cleaning up any existing containers..."
$DOCKER_CMD down --remove-orphans || true

# Ask user for configuration
echo "Do you want to rebuild the Docker images? (y/n) [y]"
read rebuild
rebuild=${rebuild:-y}

echo "Do you want to run in detached mode? (y/n) [n]"
read detached
detached=${detached:-n}

# Remove old docker volumes that might be causing the ContainerConfig error
echo "Pruning unused Docker resources..."
$DOCKER_CMD rm -f $(docker ps -a -q --filter "name=clone2_blocksize") 2>/dev/null || true
docker volume prune -f || true

# Build and run the Docker containers
if [[ "$rebuild" =~ ^[Yy]$ ]]; then
    echo "Removing any old images to ensure clean rebuild..."
    $DOCKER_CMD rm -f $(docker ps -a -q) 2>/dev/null || true
    $DOCKER_CMD build --no-cache backend || true
    $DOCKER_CMD build --no-cache frontend || true
    
    if [[ "$detached" =~ ^[Yy]$ ]]; then
        echo "Starting services in detached mode with rebuild..."
        $DOCKER_CMD up -d --build --force-recreate
    else
        echo "Starting services with rebuild..."
        $DOCKER_CMD up --build --force-recreate
    fi
else
    if [[ "$detached" =~ ^[Yy]$ ]]; then
        echo "Starting services in detached mode..."
        $DOCKER_CMD up -d
    else
        echo "Starting services..."
        $DOCKER_CMD up
    fi
fi 