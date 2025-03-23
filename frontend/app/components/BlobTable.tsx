import React, { useMemo, useState } from 'react';
import { BlockBlobs, BlobInfo } from '../api/blockService';

interface BlobTableProps {
  blockBlobs: BlockBlobs[];
}

const BlobTable: React.FC<BlobTableProps> = ({ blockBlobs }) => {
  const [sortColumn, setSortColumn] = useState<string>('slot');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Flatten the blob data for easier display and sorting
  const flattenedData = useMemo(() => {
    const result: (BlobInfo & { slot: number })[] = [];
    
    blockBlobs.forEach(blockBlob => {
      if (blockBlob.blobs.length === 0) {
        // If there are no blobs, add a placeholder row to show there are no blobs for this slot
        result.push({
          slot: blockBlob.slot,
          index: '-',
          size: 0,
          compressed_size: 0,
          compression_ratio: 0,
          zero_bytes: 0,
          non_zero_bytes: 0,
          zero_percentage: 0,
          isPlaceholder: true
        } as any);
      } else {
        // Otherwise, add each blob with its slot number
        blockBlob.blobs.forEach(blob => {
          result.push({
            ...blob,
            slot: blockBlob.slot
          });
        });
      }
    });
    
    return result;
  }, [blockBlobs]);

  // Handle sorting
  const sortedData = useMemo(() => {
    return [...flattenedData].sort((a, b) => {
      let aValue = a[sortColumn as keyof typeof a];
      let bValue = b[sortColumn as keyof typeof b];
      
      // For numeric values, sort numerically
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // For string values, sort alphabetically
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }, [flattenedData, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending order
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Helper function to render sort indicator
  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Format sizes for display (KB)
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0';
    return (bytes / 1024).toFixed(2);
  };

  // Format percentages
  const formatPercentage = (value: number) => {
    return value.toFixed(2);
  };

  if (blockBlobs.length === 0) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Blob Data</h2>
        <p className="text-slate-300">No blob data available for the selected range.</p>
      </div>
    );
  }

  const totalBlobCount = blockBlobs.reduce((acc, block) => acc + block.count, 0);

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Blob Data</h2>
      
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-slate-300 text-sm mb-1">Total Blobs</div>
          <div className="text-white text-xl font-medium">{totalBlobCount}</div>
        </div>
        
        {totalBlobCount > 0 && (
          <>
            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="text-slate-300 text-sm mb-1">Avg. Blob Size</div>
              <div className="text-white text-xl font-medium">
                {formatSize(flattenedData.reduce((acc, blob) => acc + (blob.size || 0), 0) / totalBlobCount)} KB
              </div>
            </div>
            
            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="text-slate-300 text-sm mb-1">Avg. Compression</div>
              <div className="text-white text-xl font-medium">
                {formatPercentage(flattenedData.reduce((acc, blob) => acc + (blob.compression_ratio || 0), 0) / totalBlobCount * 100)}%
              </div>
            </div>
            
            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="text-slate-300 text-sm mb-1">Avg. Zero Bytes</div>
              <div className="text-white text-xl font-medium">
                {formatPercentage(flattenedData.reduce((acc, blob) => acc + (blob.zero_percentage || 0), 0) / totalBlobCount)}%
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-slate-300">
          <thead className="bg-slate-700">
            <tr>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-600"
                onClick={() => handleSort('slot')}
              >
                Slot {renderSortIndicator('slot')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-600"
                onClick={() => handleSort('index')}
              >
                Index {renderSortIndicator('index')}
              </th>
              <th 
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-600"
                onClick={() => handleSort('size')}
              >
                Size (KB) {renderSortIndicator('size')}
              </th>
              <th 
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-600"
                onClick={() => handleSort('compressed_size')}
              >
                Compressed (KB) {renderSortIndicator('compressed_size')}
              </th>
              <th 
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-600"
                onClick={() => handleSort('compression_ratio')}
              >
                Comp. Ratio {renderSortIndicator('compression_ratio')}
              </th>
              <th 
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-600"
                onClick={() => handleSort('zero_percentage')}
              >
                Zero Bytes % {renderSortIndicator('zero_percentage')}
              </th>
              <th 
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-600"
                onClick={() => handleSort('non_zero_bytes')}
              >
                Non-zero Bytes {renderSortIndicator('non_zero_bytes')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sortedData.map((blob, index) => (
              <tr 
                key={`${blob.slot}-${blob.index}-${index}`} 
                className={`hover:bg-slate-700 ${(blob as any).isPlaceholder ? 'text-slate-500 italic' : ''}`}
              >
                <td className="px-4 py-3">{blob.slot}</td>
                <td className="px-4 py-3">{blob.index}</td>
                <td className="px-4 py-3 text-right">
                  {(blob as any).isPlaceholder ? 'No blobs' : formatSize(blob.size)}
                </td>
                <td className="px-4 py-3 text-right">
                  {(blob as any).isPlaceholder ? '-' : formatSize(blob.compressed_size)}
                </td>
                <td className="px-4 py-3 text-right">
                  {(blob as any).isPlaceholder ? '-' : formatPercentage(blob.compression_ratio * 100) + '%'}
                </td>
                <td className="px-4 py-3 text-right">
                  {(blob as any).isPlaceholder ? '-' : formatPercentage(blob.zero_percentage) + '%'}
                </td>
                <td className="px-4 py-3 text-right">
                  {(blob as any).isPlaceholder ? '-' : formatSize(blob.non_zero_bytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(BlobTable); 