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

# Start the backend with local endpoints
echo "Starting backend with local endpoints..."
cd backend
# Activate the virtual environment
source venv/bin/activate
$PYTHON_CMD app.py --use-local &
BACKEND_PID=$!
cd ..

# Wait a moment for the backend to start
sleep 2

# Check if the backend started successfully
if ! curl -s http://localhost:5000/health > /dev/null; then
  echo "Warning: Backend doesn't seem to be running correctly. Check for errors."
fi

# Start the frontend
echo "Starting frontend..."
cd frontend
if [ -d "node_modules" ]; then
  npm run dev &
  FRONTEND_PID=$!
else
  echo "Warning: Frontend dependencies not installed. Run 'cd frontend && npm install' first."
fi
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