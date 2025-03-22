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
- [Ethereum Beacon Node](https://ethereum.org/en/developers/docs/nodes-and-clients/) (like Lighthouse, Prysm, or Nimbus)

## Setup

### Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   ```
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Configure your Ethereum beacon node:
   - Edit the `.env` file to set your beacon node URL
   - Default is `http://localhost:5052`

6. Run the server:
   ```
   python app.py
   ```

### Frontend

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running the Full Application

You can run both the backend and frontend with a single command using the provided script:

```
./dev.sh
```

## Connecting to a Beacon Node

The application requires access to an Ethereum Beacon Chain node. Options include:

1. **Local Node**: Run a beacon client like Lighthouse, Prysm, or Nimbus
   - [Lighthouse](https://lighthouse-book.sigmaprime.io/installation.html)
   - [Prysm](https://docs.prylabs.network/docs/install/install-with-script)
   - [Nimbus](https://nimbus.guide/quick-start.html)

2. **Remote Node**: Use a service like Infura or Alchemy

Update the `BEACON_NODE_URL` in the `.env` file with your node's HTTP API endpoint.

## Troubleshooting

### SSZ Import Error

If you see an error related to the SSZ import, you may need to manually install the correct package:

```
pip install pySSZ
```

### Backend Connection Error

If the frontend shows "Error loading block data":

1. Check if your backend is running (`python app.py` in the backend directory)
2. Verify the backend is accessible at http://localhost:5000
3. Check if CORS is properly enabled in the backend

### Beacon Node Connection

If the backend can't connect to the beacon node:

1. Verify your beacon node is running and the API is accessible
2. Check the URL in the backend `.env` file
3. Make sure the beacon node's HTTP API is enabled and properly configured

### Common Endpoints for Beacon Nodes:

- Lighthouse: `http://localhost:5052`
- Prysm: `http://localhost:3500`
- Nimbus: `http://localhost:5052`
- Teku: `http://localhost:5051`

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