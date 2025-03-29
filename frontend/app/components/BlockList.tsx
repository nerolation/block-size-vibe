import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Block } from '../api/blockService';

interface BlockListProps {
  blocks: Block[];
}

const BlockList: React.FC<BlockListProps> = ({ blocks }) => {
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevBlocksRef = useRef<Block[]>([]);
  
  // Detect changes in blocks for smooth transitions
  useEffect(() => {
    if (blocks.length > 0 && JSON.stringify(blocks) !== JSON.stringify(prevBlocksRef.current)) {
      setIsTransitioning(true);
      
      // Store current blocks for comparison
      prevBlocksRef.current = blocks;
      
      // Reset transition state after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [blocks]);
  
  // Sort blocks by slot in descending order (newest first), wrapped in useMemo
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => b.slot - a.slot);
  }, [blocks]);
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };
  
  const toggleExpand = (slot: number) => {
    if (expandedSlot === slot) {
      setExpandedSlot(null);
    } else {
      setExpandedSlot(slot);
    }
  };

  // Hardcoded mock block roots for consistent display - will be replaced with real values when API is available
  const mockBlockRoots: Record<number, string> = {
    12345: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    12346: "0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef",
    12347: "0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef"
  };
  
  // Ensure the block root is available
  const getBlockRoot = (block: Block): string => {
    // First try the actual block_root from the data
    if (block.block_root && typeof block.block_root === 'string' && block.block_root.length > 0) {
      return block.block_root;
    }
    
    // Use our hardcoded mock values as fallback
    if (mockBlockRoots[block.slot]) {
      return mockBlockRoots[block.slot];
    }
    
    // Last resort fallback
    return `0x${block.slot.toString(16).padStart(64, '0')}`;
  };

  return (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-4 text-white">Block Details</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-slate-300">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-4 py-2 text-left">Slot</th>
              <th className="px-4 py-2 text-right">SSZ Size</th>
              <th className="px-4 py-2 text-right">Snappy Size</th>
              <th className="px-4 py-2 text-right">Compression</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sortedBlocks.map((block, index) => {
              const blockRoot = getBlockRoot(block);
              
              return (
                <React.Fragment key={`block-${block.slot}-${index}`}>
                  <tr className="hover:bg-slate-700 cursor-pointer" onClick={() => toggleExpand(block.slot)}>
                    <td className="px-4 py-2">{block.slot}</td>
                    <td className="px-4 py-2 text-right">{formatBytes(block.ssz_size)}</td>
                    <td className="px-4 py-2 text-right">{formatBytes(block.snappy_size)}</td>
                    <td className="px-4 py-2 text-right">{(block.compression_ratio * 100).toFixed(2)}%</td>
                    <td className="px-4 py-2 text-right">
                      <button 
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        aria-label={expandedSlot === block.slot ? "Collapse details" : "Expand details"}
                      >
                        {expandedSlot === block.slot ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {expandedSlot === block.slot && (
                    <tr className="bg-slate-700/50">
                      <td colSpan={5} className="px-4 py-2">
                        <div className="text-sm">
                          <p className="mb-1">
                            <span className="text-slate-400">Block Number:</span>{' '}
                            <span className="text-white font-medium">
                              {block.slot}
                            </span>
                          </p>
                          <p className="mb-1">
                            <span className="text-slate-400">Timestamp:</span>{' '}
                            {formatTimestamp(block.timestamp)}
                          </p>
                          <div className="mt-2">
                            <p className="mb-1 text-slate-400">Components:</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(block.components).map(([key, value]) => (
                                <div key={`${block.slot}-${key}`} className="bg-slate-800 px-2 py-1 rounded">
                                  <span className="text-xs text-slate-400">{key.replace(/_/g, ' ')}:</span>{' '}
                                  <span className="text-white">{formatBytes(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(BlockList); 