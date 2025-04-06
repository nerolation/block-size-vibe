FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for python-snappy
RUN apt-get update && apt-get install -y gcc g++ python3-dev libsnappy-dev curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application
EXPOSE 5000
# Using default values if environment variables are not set
CMD python app.py --beacon-url "${BEACON_NODE_URL:-http://localhost:5052/}" --execution-url "${EXECUTION_NODE_URL:-http://localhost:8545/}" --api-key "${X_API_KEY:-}" 