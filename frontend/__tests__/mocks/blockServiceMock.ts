import { Block, BlockComponent } from '../../app/api/blockService';

// Mock data for tests
export const mockBlockComponent: BlockComponent = {
  execution_payload: 74240,
  attestations: 24576,
  deposits: 0,
  proposer_slashings: 0,
  attester_slashings: 0,
  voluntary_exits: 0,
  sync_aggregate: 2048,
  blob_kzg_commitments: 11776
};

export const createMockBlock = (slot: number, overrides = {}): Block => ({
  slot,
  ssz_size: 112640,
  snappy_size: 56320,
  compression_ratio: 0.5,
  components: { ...mockBlockComponent },
  block_root: `0x${slot.toString(16).padStart(64, '0')}`,
  timestamp: Math.floor(Date.now() / 1000) - (1000 - slot),
  ...overrides
});

// Generate a sequence of mock blocks
export const generateMockBlocks = (startSlot: number, count: number): Block[] => {
  const blocks: Block[] = [];
  
  for (let i = 0; i < count; i++) {
    const slot = startSlot + i;
    // Add some variety to the blocks for realistic testing
    const ssz_size = 100000 + Math.floor(Math.random() * 30000);
    const snappy_size = Math.floor(ssz_size * (0.45 + Math.random() * 0.1));
    
    blocks.push(createMockBlock(slot, {
      ssz_size,
      snappy_size,
      compression_ratio: snappy_size / ssz_size,
      components: {
        ...mockBlockComponent,
        execution_payload: 70000 + Math.floor(Math.random() * 10000),
        attestations: 20000 + Math.floor(Math.random() * 8000),
      }
    }));
  }
  
  return blocks;
}; 