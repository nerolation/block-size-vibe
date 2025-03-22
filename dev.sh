#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== Ethereum Block Size Dashboard =====${NC}"
echo -e "Starting development environment..."

# Check Python is installed
if ! command -v python &> /dev/null; then
    echo -e "${RED}Error: Python not found. Please install Python 3.${NC}"
    exit 1
fi

# Check Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js not found. Please install Node.js.${NC}"
    exit 1
fi

# Check NPM is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm not found. Please install npm.${NC}"
    exit 1
fi

# Check if the backend virtual environment exists
cd backend
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment. Check if python-venv is installed.${NC}"
        exit 1
    fi
fi

# Activate virtual environment
echo -e "${GREEN}Activating virtual environment...${NC}"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # Unix/Linux/MacOS
    source venv/bin/activate
fi

# Check if requirements are installed
echo -e "${GREEN}Checking backend dependencies...${NC}"
if [ ! -f "venv/pyvenv.cfg" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install backend dependencies.${NC}"
        exit 1
    fi
fi

# Start backend in the background
echo -e "${GREEN}Starting Flask backend...${NC}"
python app.py &
BACKEND_PID=$!
cd ..

# Wait a moment for the backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 2

# Install frontend dependencies if needed
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install frontend dependencies.${NC}"
        kill $BACKEND_PID
        exit 1
    fi
fi

# Start frontend
echo -e "${GREEN}Starting Next.js frontend...${NC}"
echo -e "${YELLOW}Dashboard will be available at: http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
npm run dev

# When frontend is terminated, kill the backend
echo -e "${GREEN}Shutting down backend server...${NC}"
kill $BACKEND_PID
echo -e "${GREEN}Done!${NC}" 