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

// Mock block list with unique block roots for each block
const MOCK_BLOCKS: Block[] = [
  { 
    ...MOCK_BLOCK, 
    slot: 12345,
    block_root: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  },
  { 
    ...MOCK_BLOCK, 
    slot: 12346, 
    ssz_size: 108544, 
    components: { ...MOCK_BLOCK.components, attestations: 20480 },
    block_root: "0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef"
  },
  { 
    ...MOCK_BLOCK, 
    slot: 12347, 
    ssz_size: 116736, 
    components: { ...MOCK_BLOCK.components, execution_payload: 78336 },
    block_root: "0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef"
  }
];

// Function to determine if we should use mock data (based on environment or query param)
const shouldUseMockData = () => {
  // Always fall back to mock data if URL param is set or if API has failed
  if (typeof window !== 'undefined') {
    // Check for explicit mock mode parameter
    if (new URLSearchParams(window.location.search).has('mock')) {
      return true;
    }
    
    // Also check if we're in fallback mode due to API failures
    // Store API failure state in session storage
    const apiFailureCount = parseInt(sessionStorage.getItem('api_failure_count') || '0');
    if (apiFailureCount > 3) {
      console.warn('Using mock data due to repeated API failures');
      return true;
    }
  }
  
  return false;
};

// Helper to track API failures
const recordApiFailure = () => {
  if (typeof window !== 'undefined') {
    const count = parseInt(sessionStorage.getItem('api_failure_count') || '0');
    sessionStorage.setItem('api_failure_count', (count + 1).toString());
  }
};

// Helper to reset API failure counter on successful request
const resetApiFailureCounter = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('api_failure_count', '0');
  }
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
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchBlock');
    return Promise.resolve(MOCK_BLOCK);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/block/${blockId}`, {
      timeout: 5000 // 5 second timeout
    });
    resetApiFailureCounter(); // Success
    return response.data;
  } catch (error) {
    console.error('Error fetching block:', error);
    recordApiFailure(); // Record failure
    
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
    resetApiFailureCounter(); // Success
    return response.data;
  } catch (error) {
    console.error('Error fetching blocks:', error);
    recordApiFailure(); // Record failure
    
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
    resetApiFailureCounter(); // Success
    return response.data;
  } catch (error) {
    console.error('Error fetching latest block:', error);
    recordApiFailure(); // Record failure
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      return MOCK_BLOCK;
    }
    
    throw error;
  }
};

/**
 * Fetch blob sidecars for a specific block
 */
export const fetchBlockBlobs = async (blockId: string | number): Promise<BlockBlobs> => {
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchBlockBlobs');
    return Promise.resolve({
      slot: typeof blockId === 'number' ? blockId : 12345,
      count: 2,
      blobs: [
        {
          index: '0',
          size: 131072,
          compressed_size: 65536,
          compression_ratio: 0.5,
          zero_bytes: 98304,
          non_zero_bytes: 32768,
          zero_percentage: 75
        },
        {
          index: '1',
          size: 131072,
          compressed_size: 78643,
          compression_ratio: 0.6,
          zero_bytes: 85196,
          non_zero_bytes: 45876,
          zero_percentage: 65
        }
      ],
      total_size: 262144,
      total_compressed_size: 144179,
      avg_compression_ratio: 0.55
    });
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blob/${blockId}`, {
      timeout: 5000 // 5 second timeout
    });
    resetApiFailureCounter(); // Success
    return response.data;
  } catch (error) {
    console.error('Error fetching blob sidecars:', error);
    recordApiFailure(); // Record failure
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      return {
        slot: typeof blockId === 'number' ? blockId : 12345,
        count: 2,
        blobs: [
          {
            index: '0',
            size: 131072,
            compressed_size: 65536,
            compression_ratio: 0.5,
            zero_bytes: 98304,
            non_zero_bytes: 32768,
            zero_percentage: 75
          },
          {
            index: '1',
            size: 131072,
            compressed_size: 78643,
            compression_ratio: 0.6,
            zero_bytes: 85196,
            non_zero_bytes: 45876,
            zero_percentage: 65
          }
        ],
        total_size: 262144,
        total_compressed_size: 144179,
        avg_compression_ratio: 0.55
      };
    }
    
    throw error;
  }
};

/**
 * Fetch blob sidecars for multiple blocks in a slot range
 */
export const fetchBlobsRange = async (startSlot: number, endSlot: number): Promise<BlockBlobs[]> => {
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchBlobsRange');
    return Promise.resolve([
      {
        slot: startSlot,
        count: 2,
        blobs: [
          {
            index: '0',
            size: 131072,
            compressed_size: 65536,
            compression_ratio: 0.5,
            zero_bytes: 98304,
            non_zero_bytes: 32768,
            zero_percentage: 75
          },
          {
            index: '1',
            size: 131072,
            compressed_size: 78643,
            compression_ratio: 0.6,
            zero_bytes: 85196,
            non_zero_bytes: 45876,
            zero_percentage: 65
          }
        ],
        total_size: 262144,
        total_compressed_size: 144179,
        avg_compression_ratio: 0.55
      },
      {
        slot: startSlot + 1,
        count: 1,
        blobs: [
          {
            index: '0',
            size: 131072,
            compressed_size: 65536,
            compression_ratio: 0.5,
            zero_bytes: 104858,
            non_zero_bytes: 26214,
            zero_percentage: 80
          }
        ],
        total_size: 131072,
        total_compressed_size: 65536,
        avg_compression_ratio: 0.5
      },
      {
        slot: endSlot,
        count: 0,
        blobs: [],
        total_size: 0,
        total_compressed_size: 0,
        avg_compression_ratio: 0
      }
    ]);
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blobs`, {
      params: { start: startSlot, end: endSlot },
      timeout: 5000 // 5 second timeout
    });
    resetApiFailureCounter(); // Success
    return response.data;
  } catch (error) {
    console.error('Error fetching blobs range:', error);
    recordApiFailure(); // Record failure
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      return [
        {
          slot: startSlot,
          count: 2,
          blobs: [
            {
              index: '0',
              size: 131072,
              compressed_size: 65536,
              compression_ratio: 0.5,
              zero_bytes: 98304,
              non_zero_bytes: 32768,
              zero_percentage: 75
            },
            {
              index: '1',
              size: 131072,
              compressed_size: 78643,
              compression_ratio: 0.6,
              zero_bytes: 85196,
              non_zero_bytes: 45876,
              zero_percentage: 65
            }
          ],
          total_size: 262144,
          total_compressed_size: 144179,
          avg_compression_ratio: 0.55
        },
        {
          slot: endSlot,
          count: 0,
          blobs: [],
          total_size: 0,
          total_compressed_size: 0,
          avg_compression_ratio: 0
        }
      ];
    }
    
    throw error;
  }
};

/**
 * Fetch blob fee data for a specific block
 */
export const fetchBlobFee = async (blockId: string | number): Promise<BlobFeeData> => {
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchBlobFee');
    
    // Generate realistic mock values
    const mockExcessBlobGas = Math.floor(Math.random() * 786432); // Random value between 0 and MAX_BLOB_GAS_PER_BLOCK
    const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477;
    const MIN_BASE_FEE_PER_BLOB_GAS = 1;
    
    // Calculate in wei first
    const blobBaseFeeWei = MIN_BASE_FEE_PER_BLOB_GAS * Math.exp(mockExcessBlobGas / BLOB_BASE_FEE_UPDATE_FRACTION);
    // Convert to Gwei and round to integer
    let blobBaseFeeGwei = Math.round(blobBaseFeeWei / 1e9);
    
    // Ensure we don't return zero for non-zero excess gas
    if (blobBaseFeeGwei === 0 && mockExcessBlobGas > 0) {
      blobBaseFeeGwei = 1;
    }
    
    return Promise.resolve({
      slot: typeof blockId === 'number' ? blockId : 12345,
      excess_blob_gas: mockExcessBlobGas,
      blob_base_fee: blobBaseFeeGwei
    });
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blob-fee/${blockId}`, {
      timeout: 5000 // 5 second timeout
    });
    
    // Reset API failure counter on success
    resetApiFailureCounter();
    
    // Validate response data
    const data = response.data;
    if (typeof data.blob_base_fee !== 'number' || data.blob_base_fee === 0) {
      console.warn('Invalid blob base fee received from API, using fallback calculation');
      // Calculate it ourselves using the excess_blob_gas value if available
      if (typeof data.excess_blob_gas === 'number' && data.excess_blob_gas > 0) {
        const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477;
        const MIN_BASE_FEE_PER_BLOB_GAS = 1;
        
        // Calculate in wei first
        const blobBaseFeeWei = MIN_BASE_FEE_PER_BLOB_GAS * Math.exp(data.excess_blob_gas / BLOB_BASE_FEE_UPDATE_FRACTION);
        // Convert to Gwei and round to integer
        data.blob_base_fee = Math.round(blobBaseFeeWei / 1e9);
        
        // Ensure we don't return zero for non-zero excess gas
        if (data.blob_base_fee === 0 && data.excess_blob_gas > 0) {
          data.blob_base_fee = 1;
        }
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching blob fee data:', error);
    // Record API failure
    recordApiFailure();
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      
      // Generate realistic mock values
      const mockExcessBlobGas = Math.floor(Math.random() * 786432);
      const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477;
      const MIN_BASE_FEE_PER_BLOB_GAS = 1;
      
      // Calculate in wei first
      const blobBaseFeeWei = MIN_BASE_FEE_PER_BLOB_GAS * Math.exp(mockExcessBlobGas / BLOB_BASE_FEE_UPDATE_FRACTION);
      // Convert to Gwei and round to integer
      let blobBaseFeeGwei = Math.round(blobBaseFeeWei / 1e9);
      
      // Ensure we don't return zero for non-zero excess gas
      if (blobBaseFeeGwei === 0 && mockExcessBlobGas > 0) {
        blobBaseFeeGwei = 1;
      }
      
      return {
        slot: typeof blockId === 'number' ? blockId : 12345,
        excess_blob_gas: mockExcessBlobGas,
        blob_base_fee: blobBaseFeeGwei
      };
    }
    
    throw error;
  }
};

/**
 * Fetch blob fee data for multiple blocks in a slot range
 */
export const fetchBlobFeesRange = async (startSlot: number, endSlot: number): Promise<BlobFeeData[]> => {
  if (shouldUseMockData()) {
    console.log('Using mock data for fetchBlobFeesRange');
    
    // Generate a series of realistic mock values
    const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477;
    const MAX_BLOB_GAS = 786432;
    
    // Create an array of increasing slots
    const slots = Array.from(
      { length: Math.min(endSlot - startSlot + 1, 20) }, 
      (_, i) => startSlot + i
    );
    
    return Promise.resolve(slots.map(slot => {
      // Generate somewhat realistic values that would show interesting patterns
      // Use a wave pattern for excess blob gas
      const wavePosition = slot % 12; // Create a repeating pattern
      const baseExcessGas = 200000 + 100000 * Math.sin(wavePosition * Math.PI / 6);
      const excessBlobGas = Math.floor(baseExcessGas + Math.random() * 50000);
      
      // Ensure within valid range
      const clampedExcessGas = Math.max(0, Math.min(excessBlobGas, MAX_BLOB_GAS));
      
      // Calculate blob base fee in wei
      const blobBaseFeeWei = Math.exp(clampedExcessGas / BLOB_BASE_FEE_UPDATE_FRACTION);
      // Convert to Gwei and round to integer
      const blobBaseFeeGwei = Math.round(blobBaseFeeWei / 1e9);
      
      // Ensure we don't return zero for non-zero excess gas
      const finalBlobBaseFeeGwei = (blobBaseFeeGwei === 0 && clampedExcessGas > 0) ? 1 : blobBaseFeeGwei;
      
      return {
        slot,
        excess_blob_gas: clampedExcessGas,
        blob_base_fee: finalBlobBaseFeeGwei
      };
    }));
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/blob-fees`, {
      params: { start: startSlot, end: endSlot },
      timeout: 5000 // 5 second timeout
    });
    
    // Reset API failure counter on success
    resetApiFailureCounter();
    
    // Validate response data and fix any issues
    const data = response.data;
    if (Array.isArray(data)) {
      const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477;
      const MIN_BASE_FEE_PER_BLOB_GAS = 1;
      
      // Check each entry and fix if needed
      return data.map(item => {
        if (typeof item.blob_base_fee !== 'number' || item.blob_base_fee === 0) {
          // Recalculate blob base fee if it's invalid
          if (typeof item.excess_blob_gas === 'number' && item.excess_blob_gas > 0) {
            // Calculate in wei first
            const blobBaseFeeWei = MIN_BASE_FEE_PER_BLOB_GAS * Math.exp(item.excess_blob_gas / BLOB_BASE_FEE_UPDATE_FRACTION);
            // Convert to Gwei and round to integer
            item.blob_base_fee = Math.round(blobBaseFeeWei / 1e9);
            
            // Ensure we don't return zero for non-zero excess gas
            if (item.blob_base_fee === 0 && item.excess_blob_gas > 0) {
              item.blob_base_fee = 1;
            }
          }
        }
        return item;
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching blob fees range:', error);
    // Record API failure
    recordApiFailure();
    
    if (axios.isAxiosError(error) && !error.response) {
      console.warn('Network error detected. Using mock data as fallback.');
      
      // Generate a series of realistic mock values
      const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477;
      const MAX_BLOB_GAS = 786432;
      
      // Create an array of increasing slots
      const slots = Array.from(
        { length: Math.min(endSlot - startSlot + 1, 20) }, 
        (_, i) => startSlot + i
      );
      
      return slots.map(slot => {
        // Generate somewhat realistic values with a wave pattern
        const wavePosition = slot % 12;
        const baseExcessGas = 200000 + 100000 * Math.sin(wavePosition * Math.PI / 6);
        const excessBlobGas = Math.floor(baseExcessGas + Math.random() * 50000);
        const clampedExcessGas = Math.max(0, Math.min(excessBlobGas, MAX_BLOB_GAS));
        
        // Calculate blob base fee in wei
        const blobBaseFeeWei = Math.exp(clampedExcessGas / BLOB_BASE_FEE_UPDATE_FRACTION);
        // Convert to Gwei and round to integer
        const blobBaseFeeGwei = Math.round(blobBaseFeeWei / 1e9);
        
        // Ensure we don't return zero for non-zero excess gas
        const finalBlobBaseFeeGwei = (blobBaseFeeGwei === 0 && clampedExcessGas > 0) ? 1 : blobBaseFeeGwei;
        
        return {
          slot,
          excess_blob_gas: clampedExcessGas,
          blob_base_fee: finalBlobBaseFeeGwei
        };
      });
    }
    
    throw error;
  }
}; 