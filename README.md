# Ethereum Block Size Dashboard

A professional, performant, and minimal dashboard for visualizing Ethereum Beacon blocks, including their SSZ-encoded size and snappy-compressed size.

## Features

- Visualize the size and contents of Ethereum Beacon blocks
- Track SSZ-encoded size and snappy-compressed size
- Time-series visualizations for block size analysis
- Detailed views of individual block components
- Auto-refresh capability to fetch the latest blocks

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Python](https://www.python.org/) (v3.8 or later)
- [Ethereum Beacon Node](https://ethereum.org/en/developers/docs/nodes-and-clients/) (like Lighthouse, Prysm, or Nimbus) - optional for local node usage

## Quick Start (Recommended)

The easiest and recommended way to run the application locally:

1. Clone the repository:
   ```
   git clone https://github.com/nerolation/block-size-ethereum.git
   cd block-size-ethereum
   ```

2. Make the script executable if needed:
   ```
   chmod +x local-dev.sh
   ```

3. Run the local development script:
   ```
   ./local-dev.sh
   ```

   If the script reports issues with dependencies, you may need to manually set up the environment first (see Manual Setup below).

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

The `local-dev.sh` script handles everything for you:
- Starts the backend with local endpoints configuration
- Starts the frontend development server
- Configures the application to use standard local node endpoints
- Automatically manages process cleanup on exit

> **Note:** A default API key is provided for development purposes. If you're connecting to remote endpoints that require authentication, you should set your own API key in the `.env` file.

## Manual Setup

If the quick start doesn't work or you prefer to set up components manually, follow these steps:

### Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python3 -m venv venv
   ```

   Note: If you have Python managed by pyenv or another version manager, ensure you use the correct Python version.

3. Activate the virtual environment:
   ```
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Configure your Ethereum beacon node:
   - Copy `.env.example` to `.env` 
   - Update the following variables:
     - `BEACON_NODE_URL`: URL to your beacon node
     - `EXECUTION_NODE_URL`: URL to your execution node
     - `X_API_KEY`: API key if required by your node

6. Run the server:
   ```
   python app.py
   ```
   
   To use local node endpoints (recommended):
   ```
   python app.py --use-local
   ```
   This will use `http://localhost:5052/` for Beacon API and `http://localhost:8545/` for Execution API.

### Frontend

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install --legacy-peer-deps
   ```

   Note: The `--legacy-peer-deps` flag may be necessary due to some dependency conflicts.

3. Run the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting Process Management

If you encounter issues with stray backend processes:

1. The scripts automatically try to detect and terminate any existing processes on port 5000 when they start
2. If you notice the backend is still running after terminating a script, run:
   ```
   ./kill-api.sh
   ```
   This utility script will find and kill any processes running on port 5000

## Connecting to a Beacon Node

The application requires access to an Ethereum Beacon Chain node and Execution node. Options include:

1. **Local Node** (Recommended for development): Run a beacon client like Lighthouse, Prysm, or Nimbus
   - [Lighthouse](https://lighthouse-book.sigmaprime.io/installation.html)
   - [Prysm](https://docs.prylabs.network/docs/install/install-with-script)
   - [Nimbus](https://nimbus.guide/quick-start.html)
   
   When using `local-dev.sh` or the `--use-local` flag, the backend will automatically connect to standard local node ports.

2. **Remote Node**: Use a service like Infura or Alchemy, or the default endpoints (requires API key)

Update the following in the `.env` file if using remote nodes:
- `BEACON_NODE_URL`: Your beacon node's HTTP API endpoint
- `EXECUTION_NODE_URL`: Your execution node's JSON-RPC endpoint
- `X_API_KEY`: Your API key if required by your node (a default development key is provided)

### Common Endpoints for Beacon Nodes:

- Lighthouse: `http://localhost:5052`
- Prysm: `http://localhost:3500`
- Nimbus: `http://localhost:5052`
- Teku: `http://localhost:5051`

## Common Troubleshooting

### Node.js Version Issues

If you encounter errors during npm install, make sure you're using a compatible Node.js version. This project has been tested with Node.js v18 and later.

### SSZ Import Error

If you see an error related to the SSZ import, you may need to manually install the correct package:

```
pip install pySSZ
```

### Backend Connection Error

If the frontend shows "Error loading block data":

1. Check if your backend is running (verify it's accessible at http://localhost:5000)
2. Check the console for error messages
3. Make sure you have the necessary Python dependencies installed

### Beacon Node Connection

If the backend can't connect to the beacon node:

1. Verify your beacon node is running and the API is accessible
2. For local nodes, ensure they're running on the standard ports
3. Make sure the beacon node's HTTP API is enabled and properly configured

## Architecture

### Frontend (React + TypeScript + Next.js)
- React with functional components, hooks, and TypeScript
- Styling with Tailwind CSS
- Data visualization with Recharts
- Data fetching with React Query

### Backend (Python Flask)
- REST API for beacon block data
- Fetches data from Ethereum beacon node
- Computes size metrics (SSZ, snappy compression)
- Component breakdown by size

## Docker Deployment

You can run the application using Docker and Docker Compose with either local or external Ethereum nodes.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

### Option 1: Using Local Ethereum Nodes (Recommended for Development)

If you have local Ethereum nodes running (like Lighthouse, Prysm, or Nimbus):

1. Make sure your nodes are running and accessible at their default ports:
   - Beacon Node: http://localhost:5052 (Lighthouse/Nimbus) or http://localhost:3500 (Prysm)
   - Execution Node: http://localhost:8545

2. Run the application with Docker:
   ```bash
   ./docker-run.sh
   ```
   or manually:
   ```bash
   docker-compose up
   ```

3. When prompted if you want to rebuild (if using docker-run.sh), choose "y" for the first run or after code changes.

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

The application will automatically connect to your local nodes.

### Option 2: Using External Ethereum Nodes

For using remote/external Ethereum node endpoints:

1. Edit the `.env` file with your external endpoints:
   ```
   BEACON_NODE_URL=https://your-beacon-node-endpoint
   EXECUTION_NODE_URL=https://your-execution-node-endpoint
   X_API_KEY=your-api-key-if-required
   ```

2. Use the provided script for a guided setup:
   ```bash
   chmod +x run-with-external-endpoints.sh
   ./run-with-external-endpoints.sh
   ```
   This script will update your `.env` file and configure Docker to use your external endpoints.

   > **SECURITY NOTE:** Never commit API keys, usernames, or passwords to version control.
   > Always use environment variables or a properly gitignored .env file for sensitive credentials.

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing Docker Setup

To quickly test if your Docker configuration works with your endpoints:

```bash
chmod +x test-docker.sh
./test-docker.sh
```

This will start the containers with the configured endpoints and display diagnostic information.

### Docker Commands Reference

#### Running the Application

Start both the backend and frontend:

```bash
docker-compose up
```

Or run in detached mode (runs in the background):

```bash
docker-compose up -d
```

The services will be available at:
- Backend API: http://localhost:5000
- Frontend: http://localhost:3000

#### Rebuilding the Images

If you make changes to the code, rebuild the images:

```bash
docker-compose up --build
```

#### Stopping the Services

```bash
docker-compose down
```

#### Troubleshooting Docker

If you encounter issues with Docker:

1. Check Docker logs:
   ```bash
   docker-compose logs
   ```

2. Ensure your nodes are accessible from Docker:
   - For local nodes, you may need to use `host.docker.internal` instead of `localhost` in your `.env` file
   - Example: `BEACON_NODE_URL=http://host.docker.internal:5052/`

3. If Docker fails to start with permission errors:
   ```bash
   sudo docker-compose up
   ```
   Or add your user to the docker group:
   ```bash
   sudo usermod -aG docker $USER
   ```
   (Log out and back in for this to take effect)