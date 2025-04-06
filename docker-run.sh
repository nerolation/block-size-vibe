#!/bin/bash

# Check if .env file exists, create from example if not
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit the .env file with your configuration before running again."
    exit 0
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    echo "Visit https://docs.docker.com/get-docker/ for installation instructions."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit https://docs.docker.com/compose/install/ for installation instructions."
    exit 1
fi

# Check Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Docker daemon is not running. Please start Docker and try again."
    exit 1
fi

# Ask user for configuration
echo "Do you want to rebuild the Docker images? (y/n) [n]"
read rebuild
rebuild=${rebuild:-n}

echo "Do you want to run in detached mode? (y/n) [n]"
read detached
detached=${detached:-n}

# Build and run the Docker containers
if [[ "$rebuild" =~ ^[Yy]$ ]]; then
    if [[ "$detached" =~ ^[Yy]$ ]]; then
        echo "Starting services in detached mode with rebuild..."
        docker-compose up -d --build
    else
        echo "Starting services with rebuild..."
        docker-compose up --build
    fi
else
    if [[ "$detached" =~ ^[Yy]$ ]]; then
        echo "Starting services in detached mode..."
        docker-compose up -d
    else
        echo "Starting services..."
        docker-compose up
    fi
fi 