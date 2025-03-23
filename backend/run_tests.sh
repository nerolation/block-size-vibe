#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set working directory to script location
cd "$(dirname "$0")"

# Ensure virtual environment is activated
if [ ! -d "venv" ]; then
    echo -e "${RED}Virtual environment not found. Create one with:${NC}"
    echo -e "python -m venv venv"
    echo -e "source venv/bin/activate"
    echo -e "pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # Unix/Linux/MacOS
    source venv/bin/activate
fi

# Check if pytest is installed
if ! python -m pytest --version > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    pip install -r requirements.txt
fi

# Banner
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  Block Size Backend Tests${NC}"
echo -e "${GREEN}====================================${NC}"

# Parse arguments
LIVE_TESTS=0
VERBOSE=0
SPECIFIC_TEST=""

for arg in "$@"; do
    case $arg in
        --live)
            LIVE_TESTS=1
            shift
            ;;
        -v|--verbose)
            VERBOSE=1
            shift
            ;;
        *)
            SPECIFIC_TEST=$arg
            shift
            ;;
    esac
done

# Build command
COMMAND="python -m pytest"

if [ $VERBOSE -eq 1 ]; then
    COMMAND="$COMMAND -v"
fi

# Run tests
if [ -n "$SPECIFIC_TEST" ]; then
    # Run specific test
    echo -e "${YELLOW}Running test: $SPECIFIC_TEST${NC}"
    $COMMAND tests/$SPECIFIC_TEST
    
elif [ $LIVE_TESTS -eq 1 ]; then
    # Run all tests including live ones
    echo -e "${YELLOW}Running all tests including live API tests...${NC}"
    $COMMAND tests/
    
else
    # Run regular tests
    echo -e "${YELLOW}Running unit tests (excluding live tests)...${NC}"
    $COMMAND tests/ -k "not live"
fi

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed successfully!${NC}"
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi

# Help message
echo -e "\n${YELLOW}Test command options:${NC}"
echo -e "  --live     : Include live tests that connect to a beacon node"
echo -e "  -v/--verbose : Show verbose test output"
echo -e "  [filename] : Run a specific test file (e.g., test_beacon_client.py)"
echo -e "\nExample: ./run_tests.sh --live -v"
echo -e "Example: ./run_tests.sh test_routes.py" 