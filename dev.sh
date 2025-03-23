#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill background processes
cleanup() {
  echo -e "\n${GREEN}Shutting down servers...${NC}"
  
  # Kill the backend process if it exists
  if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${GREEN}Terminating backend server (PID: $BACKEND_PID)...${NC}"
    kill -TERM $BACKEND_PID 2>/dev/null || kill -KILL $BACKEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
  fi
  
  # Find and kill any stray Python processes running on port 5000
  STRAY_PID=$(lsof -i:5000 -t 2>/dev/null)
  if [ ! -z "$STRAY_PID" ]; then
    echo -e "${YELLOW}Found stray backend process on port 5000 (PID: $STRAY_PID), terminating...${NC}"
    kill -TERM $STRAY_PID 2>/dev/null || kill -KILL $STRAY_PID 2>/dev/null
  fi
  
  echo -e "${GREEN}Cleanup complete. Goodbye!${NC}"
  exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM EXIT

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

# Check for any existing backend processes and kill them
EXISTING_PID=$(lsof -i:5000 -t 2>/dev/null)
if [ ! -z "$EXISTING_PID" ]; then
    echo -e "${YELLOW}Found existing backend process on port 5000, terminating...${NC}"
    kill -TERM $EXISTING_PID 2>/dev/null || kill -KILL $EXISTING_PID 2>/dev/null
    sleep 1
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

# Check if backend started successfully
sleep 2
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Backend failed to start. Check for errors above.${NC}"
    exit 1
fi
echo -e "${GREEN}Backend running with PID: $BACKEND_PID${NC}"

# Install frontend dependencies if needed
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install frontend dependencies.${NC}"
        cleanup
        exit 1
    fi
fi

# Start frontend
echo -e "${GREEN}Starting Next.js frontend...${NC}"
echo -e "${YELLOW}Dashboard will be available at: http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Run the frontend in foreground - when this exits, our trap will clean up
npm run dev

# We shouldn't reach here normally, but just in case
cleanup 