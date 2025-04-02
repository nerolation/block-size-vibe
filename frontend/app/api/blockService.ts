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

export interface BlobInfo {
  index: string;
  size: number;
  compressed_size: number;
  compression_ratio: number;
  zero_bytes: number;
  non_zero_bytes: number;
  zero_percentage: number;
}

export interface BlockBlobs {
  slot: number;
  count: number;
  blobs: BlobInfo[];
  total_size: number;
  total_compressed_size: number;
  avg_compression_ratio: number;
  error?: string;
}

export interface BlobFeeData {
  slot: number;
  excess_blob_gas: number;
  blob_base_fee: number;
  error?: string;
}

/**
 * Fetch a single block by slot number or 'head'
 */
export const fetchBlock = async (blockId: string | number): Promise<Block> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/block/${blockId}`, {
      timeout: 15000 // 15 second timeout
    });
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
      params: { start: startSlot, end: endSlot },
      timeout: 15000 // 15 second timeout
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
    const response = await axios.get(`${API_BASE_URL}/latest`, {
      timeout: 15000 // 15 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching latest block:', error);
    throw error;
  }
};

/**
 * Fetch blob sidecars for a specific block
 */
export const fetchBlockBlobs = async (blockId: string | number): Promise<BlockBlobs> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/blob/${blockId}`, {
      timeout: 15000 // 15 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching blob sidecars:', error);
    throw error;
  }
};

/**
 * Fetch blob sidecars for multiple blocks in a slot range
 */
export const fetchBlobsRange = async (startSlot: number, endSlot: number): Promise<BlockBlobs[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/blobs`, {
      params: { start: startSlot, end: endSlot },
      timeout: 15000 // 15 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching blobs range:', error);
    throw error;
  }
};

/**
 * Fetch blob fee data for a specific block
 */
export const fetchBlobFee = async (blockId: string | number): Promise<BlobFeeData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/blob-fee/${blockId}`, {
      timeout: 15000 // 15 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching blob fee data:', error);
    throw error;
  }
};

/**
 * Fetch blob fee data for multiple blocks in a slot range
 */
export const fetchBlobFeesRange = async (startSlot: number, endSlot: number): Promise<BlobFeeData[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/blob-fees`, {
      params: { start: startSlot, end: endSlot },
      timeout: 15000 // 15 second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching blob fees range:', error);
    throw error;
  }
}; 