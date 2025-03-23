import React, { useMemo, useState, useRef, useEffect } from 'react';
import { BlockBlobs } from '../api/blockService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

interface BlobChartProps {
  blockBlobs: BlockBlobs[];
}

const BlobChart: React.FC<BlobChartProps> = ({ blockBlobs }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevBlocksRef = useRef<BlockBlobs[]>([]);
  
  // Detect changes in blocks for smooth transitions
  useEffect(() => {
    if (blockBlobs.length > 0 && JSON.stringify(blockBlobs) !== JSON.stringify(prevBlocksRef.current)) {
      setIsTransitioning(true);
      
      // Store current blocks for comparison
      prevBlocksRef.current = blockBlobs;
      
      // Reset transition state after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [blockBlobs]);

  // Transform data for visualization
  const chartData = useMemo(() => {
    // Ensure blocks are sorted by slot
    const sortedBlocks = [...blockBlobs].sort((a, b) => a.slot - b.slot);
    
    return sortedBlocks.map(block => {
      return {
        slot: block.slot,
        'Total Blob Size (KB)': block.count > 0 ? Math.round(block.total_size / 1024 * 100) / 100 : 0,
        'Total Compressed Size (KB)': block.count > 0 ? Math.round(block.total_compressed_size / 1024 * 100) / 100 : 0,
        'Blob Count': block.count,
      };
    });
  }, [blockBlobs]);

  // Custom tooltip component for better display
  const CustomTooltip = React.memo(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 border border-slate-700 rounded shadow-lg text-sm">
          <p className="text-white font-medium mb-2">Slot: {label}</p>
          {payload.map((entry: any, index: number) => {
            let value = entry.value;
            let name = entry.name;
            
            // Format values based on name
            if (name.includes('KB')) {
              value = `${value} KB`;
            }
            
            // Skip empty values
            if (value === 0 || value === '0 KB') {
              return null;
            }
            
            return (
              <div key={`tooltip-${index}`} className="flex justify-between mb-1">
                <span className="mr-4 text-slate-300">{name}:</span>
                <span className="font-medium text-white">{value}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  });

  // Don't render the chart if there's no data
  const hasBlobs = blockBlobs.some(block => block.count > 0);
  
  if (!hasBlobs) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Blob Sizes</h2>
        <p className="text-slate-300">No blob data available for the selected range.</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-4 text-white">Blob Sizes</h2>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 40, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis 
            dataKey="slot" 
            tick={{ fill: '#cbd5e1' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            orientation="left"
            tick={{ fill: '#cbd5e1' }}
            label={{ 
              value: 'Size (KB)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: '#cbd5e1' },
              offset: 0
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#cbd5e1' }} />
          
          <Bar 
            name="Total Blob Size"
            dataKey="Total Blob Size (KB)" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
          <Bar 
            name="Total Compressed Size"
            dataKey="Total Compressed Size (KB)" 
            fill="#8b5cf6" 
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(BlobChart); 