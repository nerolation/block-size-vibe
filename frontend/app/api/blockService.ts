import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Mock data for fallback when API is unreachable
const MOCK_BLOCK: Block = {
  slot: 12345,
  ssz_size: 112640,
  snappy_size: 56320,
  compression_ratio: 0.5,
  components: {
    execution_payload: 74240,
    attestations: 24576,
    deposits: 0,
    proposer_slashings: 0,
    attester_slashings: 0,
    voluntary_exits: 0,
    sync_aggregate: 2048,
    blob_kzg_commitments: 11776
  },
  block_root: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  timestamp: Date.now() / 1000
};

// Mock block list
const MOCK_BLOCKS: Block[] = [
  { ...MOCK_BLOCK, slot: 12345 },
  { ...MOCK_BLOCK, slot: 12346, ssz_size: 108544, components: { ...MOCK_BLOCK.components, attestations: 20480 } },
  { ...MOCK_BLOCK, slot: 12347, ssz_size: 116736, components: { ...MOCK_BLOCK.components, execution_payload: 78336 } }
];

// Function to determine if we should use mock data (based on environment or query param)
const shouldUseMockData = () => {
  if (typeof window !== 'undefined') {
    // Check URL for mock param
    return new URLSearchParams(window.location.search).has('mock');
  }
  return false;
};

export interface BlockComponent {
  execution_payload: number;
  attestations: number;
  deposits: number;
  proposer_slashings: number;
  attester_slashings: number;
  voluntary_exits: number;
  sync_aggregate: number;
  blob_kzg_commitments?: number;
}

export interface Block {
  slot: number;
  ssz_size: number;
  snappy_size: number;
  compression_ratio: number;
  components: BlockComponent;
  block_root: string;
  timestamp: number;
}

/**
 * Fetch a single block by slot number or 'head'
 */
export const fetchBlock = async (blockId: string | number): Promise<Block> => {
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchBlock');
    return Promise.resolve(MOCK_BLOCK);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/block/${blockId}`, {
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching block:', error);
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      return MOCK_BLOCK;
    }
    
    throw error;
  }
};

/**
 * Fetch multiple blocks within a slot range
 */
export const fetchBlocks = async (startSlot: number, endSlot: number): Promise<Block[]> => {
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchBlocks');
    return Promise.resolve(MOCK_BLOCKS);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blocks`, {
      params: { start: startSlot, end: endSlot },
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching blocks:', error);
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      return MOCK_BLOCKS;
    }
    
    throw error;
  }
};

/**
 * Fetch the latest (head) block
 */
export const fetchLatestBlock = async (): Promise<Block> => {
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchLatestBlock');
    return Promise.resolve(MOCK_BLOCK);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/latest`, {
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching latest block:', error);
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      return MOCK_BLOCK;
    }
    
    throw error;
  }
}; 