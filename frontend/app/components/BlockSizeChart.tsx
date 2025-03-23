import { Block } from '../api/blockService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  TooltipProps
} from 'recharts';
import React, { useMemo, useState, useRef, useEffect } from 'react';

interface BlockSizeChartProps {
  blocks: Block[];
}

const BlockSizeChart: React.FC<BlockSizeChartProps> = ({ blocks }) => {
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

  // Transform data for visualization, wrapped in useMemo to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    // Ensure blocks are sorted by slot
    const sortedBlocks = [...blocks].sort((a, b) => a.slot - b.slot);
    
    return sortedBlocks.map(block => ({
      slot: block.slot,
      'SSZ Size (KB)': Math.round(block.ssz_size / 1024 * 100) / 100,
      'Snappy Size (KB)': Math.round(block.snappy_size / 1024 * 100) / 100,
      compressionRatio: block.compression_ratio,
      compressionPercentage: Math.round(block.compression_ratio * 100)
    }));
  }, [blocks]);

  // Custom tooltip component to ensure proper display of units
  const CustomTooltip = React.memo(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 border border-slate-700 rounded shadow-lg text-sm">
          <p className="text-white font-medium mb-2">Slot: {label}</p>
          {payload.map((entry: any, index: number) => {
            let valueWithUnit = entry.value;
            let name = entry.name;
            
            // Add appropriate units based on the data key
            if (entry.dataKey === 'compressionPercentage') {
              valueWithUnit = `${entry.value}%`;
              name = 'Compression';
            } else if (entry.dataKey.includes('KB')) {
              valueWithUnit = `${entry.value} KB`;
              name = entry.dataKey.replace(' (KB)', '');
            }
            
            return (
              <div key={`tooltip-${index}`} className="flex justify-between mb-1">
                <span className="mr-4 text-slate-300">{name}:</span>
                <span className="font-medium text-white">{valueWithUnit}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  });

  return (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-4 text-white">Block Size Comparison</h2>
      
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 40, right: 70, left: 20, bottom: 60 }}
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
            yAxisId="left"
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
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#cbd5e1' }}
            label={{ 
              value: 'Compression (%)', 
              angle: 90, 
              position: 'insideRight',
              style: { fill: '#cbd5e1' },
              offset: 15
            }}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#cbd5e1' }} />
          <Bar 
            yAxisId="left"
            name="SSZ Size"
            dataKey="SSZ Size (KB)" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
          <Bar 
            yAxisId="left"
            name="Snappy Size"
            dataKey="Snappy Size (KB)" 
            fill="#8b5cf6" 
            radius={[4, 4, 0, 0]}
            animationDuration={300}
          />
          <Line
            yAxisId="right"
            type="monotone"
            name="Compression"
            dataKey="compressionPercentage"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4, fill: '#10b981' }}
            activeDot={{ r: 6 }}
            animationDuration={300}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(BlockSizeChart); 