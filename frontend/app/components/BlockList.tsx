import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Block } from '../api/blockService';

interface BlockListProps {
  blocks: Block[];
}

const BlockList: React.FC<BlockListProps> = ({ blocks }) => {
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
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
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  const toggleExpand = (blockRoot: string) => {
    if (expandedBlock === blockRoot) {
      setExpandedBlock(null);
    } else {
      setExpandedBlock(blockRoot);
    }
  };

  // Memoize the block row to prevent re-rendering every block on each update
  const BlockRow = React.memo(({ block, isExpanded, onToggle }: { 
    block: Block, 
    isExpanded: boolean,
    onToggle: () => void
  }) => (
    <tr className="hover:bg-slate-700 text-slate-300 transition-colors duration-200">
      <td className="px-4 py-3 font-medium text-white">{block.slot}</td>
      <td className="px-4 py-3">{formatTimestamp(block.timestamp)}</td>
      <td className="px-4 py-3">{formatBytes(block.ssz_size)}</td>
      <td className="px-4 py-3">{formatBytes(block.snappy_size)}</td>
      <td className="px-4 py-3">{(block.compression_ratio * 100).toFixed(1)}%</td>
      <td className="px-4 py-3">
        <button
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs text-white transition-colors duration-200"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </td>
    </tr>
  ));

  // Separate component for details row
  const DetailsRow = React.memo(({ block }: { block: Block }) => (
    <tr className="bg-slate-900 animate-fadeIn">
      <td colSpan={6} className="px-4 py-3">
        <div className="text-sm">
          <h3 className="font-medium text-white mb-2">Component Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Object.entries(block.components).map(([key, value], componentIndex) => (
              <div key={`component-${key}-${componentIndex}`} className="flex justify-between items-center border border-slate-700 p-2 rounded">
                <span className="text-slate-300 capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="text-white font-medium">{formatBytes(value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <p className="mb-1">Block Root: {block.block_root}</p>
          </div>
        </div>
      </td>
    </tr>
  ));

  // Render the table with rows and separate detail rows
  return (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-4 text-white">Block Details</h2>
      
      <p className="text-sm text-slate-400 mb-4">
        SSZ Size represents the serialized size using SimpleSerialize. Snappy Size shows the compressed size after applying Snappy compression.
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-2 rounded-tl-lg">Slot</th>
              <th className="px-4 py-2">Slot Timestamp</th>
              <th className="px-4 py-2">SSZ Size</th>
              <th className="px-4 py-2">Snappy Size</th>
              <th className="px-4 py-2">Compression</th>
              <th className="px-4 py-2 rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600">
            {sortedBlocks.map((block, index) => {
              const isExpanded = expandedBlock === block.block_root;
              return (
                <React.Fragment key={`block-${block.block_root}-${index}`}>
                  <BlockRow 
                    block={block}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(block.block_root)}
                  />
                  {isExpanded && <DetailsRow block={block} />}
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