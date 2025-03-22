import { useState } from 'react';
import { Block } from '../api/blockService';

interface BlockListProps {
  blocks: Block[];
}

const BlockList: React.FC<BlockListProps> = ({ blocks }) => {
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  
  // Sort blocks by slot in descending order (newest first)
  const sortedBlocks = [...blocks].sort((a, b) => b.slot - a.slot);
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const toggleExpand = (blockRoot: string) => {
    if (expandedBlock === blockRoot) {
      setExpandedBlock(null);
    } else {
      setExpandedBlock(blockRoot);
    }
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Block Details</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-2 rounded-tl-lg">Slot</th>
              <th className="px-4 py-2">Timestamp</th>
              <th className="px-4 py-2">SSZ Size</th>
              <th className="px-4 py-2">Snappy Size</th>
              <th className="px-4 py-2">Compression</th>
              <th className="px-4 py-2 rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600">
            {sortedBlocks.map(block => (
              <>
                <tr 
                  key={block.block_root} 
                  className="hover:bg-slate-700 text-slate-300"
                >
                  <td className="px-4 py-3 font-medium text-white">{block.slot}</td>
                  <td className="px-4 py-3">{formatTimestamp(block.timestamp)}</td>
                  <td className="px-4 py-3">{formatBytes(block.ssz_size)}</td>
                  <td className="px-4 py-3">{formatBytes(block.snappy_size)}</td>
                  <td className="px-4 py-3">{(block.compression_ratio * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleExpand(block.block_root)}
                      className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs text-white"
                    >
                      {expandedBlock === block.block_root ? 'Hide Details' : 'Show Details'}
                    </button>
                  </td>
                </tr>
                
                {expandedBlock === block.block_root && (
                  <tr className="bg-slate-900">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="text-sm">
                        <h3 className="font-medium text-white mb-2">Component Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {Object.entries(block.components).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center border border-slate-700 p-2 rounded">
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
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlockList; 