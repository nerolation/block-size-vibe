#!/bin/bash

# Kill any existing processes on port 5000
echo "Checking for existing processes on port 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
  echo "Killed existing process on port 5000"
else
  echo "No existing process found on port 5000"
fi

# Handle cleanup on exit
cleanup() {
  echo "Stopping servers..."
  pkill -P $$
  exit 0
}

trap cleanup INT TERM

# Change to the project root directory
cd "$(dirname "$0")"

# Use the correct Python version
PYTHON_CMD="python3"
if ! command -v $PYTHON_CMD &> /dev/null; then
  # Try using pyenv to find the correct Python
  if command -v pyenv &> /dev/null; then
    PYTHON_CMD="$(pyenv which python)"
    echo "Using pyenv Python: $PYTHON_CMD"
  else
    echo "Error: Cannot find Python 3. Please install it or update this script."
    exit 1
  fi
fi

# Check and set up backend environment if needed
echo "Checking backend environment..."
cd backend
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  $PYTHON_CMD -m venv venv
  if [ $? -ne 0 ]; then
    echo "Failed to create virtual environment. Please check Python installation or create it manually."
    echo "See README.md for manual setup instructions."
    exit 1
  fi
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
if [ ! -f "venv/pyvenv.cfg" ] || ! pip freeze | grep -q "Flask"; then
  echo "Installing backend dependencies..."
  pip install -r requirements.txt
  if [ $? -ne 0 ]; then
    echo "Failed to install backend dependencies. See README.md for manual setup instructions."
    exit 1
  fi
fi

# Start the backend with local endpoints
echo "Starting backend with local endpoints..."
python app.py --use-local &
BACKEND_PID=$!
cd ..

# Wait a moment for the backend to start
sleep 2

# Check if the backend started successfully
if ! curl -s http://localhost:5000/health > /dev/null; then
  echo "Warning: Backend doesn't seem to be running correctly. Check for errors."
fi

# Check and set up frontend if needed
echo "Checking frontend environment..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies (this may take a minute)..."
  npm install --legacy-peer-deps
  if [ $? -ne 0 ]; then
    echo "Failed to install frontend dependencies. See README.md for manual setup instructions."
    exit 1
  fi
fi

# Start the frontend
echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Application is running!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo "Using local endpoints:"
echo "  Beacon API: http://localhost:5052/"
echo "  Execution API: http://localhost:8545/"
echo "Press Ctrl+C to stop all servers"

# Wait for the backend to finish (this keeps the script running)
wait $BACKEND_PID 