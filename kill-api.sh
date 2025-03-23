#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking for processes running on port 5000...${NC}"

# Find processes using port 5000
PORT_PIDS=$(lsof -i:5000 -t 2>/dev/null)

if [ -z "$PORT_PIDS" ]; then
    echo -e "${GREEN}No processes found running on port 5000.${NC}"
    exit 0
fi

# Count how many processes we found
NUM_PIDS=$(echo "$PORT_PIDS" | wc -l)
echo -e "${YELLOW}Found $NUM_PIDS process(es) using port 5000.${NC}"

# Kill each process
for PID in $PORT_PIDS; do
    PROCESS=$(ps -p $PID -o comm= 2>/dev/null)
    echo -e "${RED}Terminating process: $PROCESS (PID: $PID)${NC}"
    kill -TERM $PID 2>/dev/null || kill -KILL $PID 2>/dev/null
done

# Verify all processes were killed
sleep 1
REMAINING=$(lsof -i:5000 -t 2>/dev/null)
if [ -z "$REMAINING" ]; then
    echo -e "${GREEN}All processes on port 5000 have been terminated.${NC}"
else
    echo -e "${RED}Some processes could not be terminated. Try running as sudo.${NC}"
    echo -e "${RED}Remaining PIDs: $REMAINING${NC}"
fi 