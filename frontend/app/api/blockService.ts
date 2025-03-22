import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  try {
    const response = await axios.get(`${API_BASE_URL}/block/${blockId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching block:', error);
    throw error;
  }
};

/**
 * Fetch multiple blocks within a slot range
 */
export const fetchBlocks = async (startSlot: number, endSlot: number): Promise<Block[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/blocks`, {
      params: { start: startSlot, end: endSlot }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  }
};

/**
 * Fetch the latest (head) block
 */
export const fetchLatestBlock = async (): Promise<Block> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/latest`);
    return response.data;
  } catch (error) {
    console.error('Error fetching latest block:', error);
    throw error;
  }
}; 