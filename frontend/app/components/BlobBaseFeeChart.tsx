import React, { useMemo, useState, useRef, useEffect } from 'react';
import { BlobFeeData } from '../api/blockService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

interface BlobBaseFeeChartProps {
  blobFees: BlobFeeData[];
}

const BlobBaseFeeChart: React.FC<BlobBaseFeeChartProps> = ({ blobFees }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevDataRef = useRef<BlobFeeData[]>([]);
  
  // Detect changes in data for smooth transitions
  useEffect(() => {
    if (blobFees.length > 0 && JSON.stringify(blobFees) !== JSON.stringify(prevDataRef.current)) {
      setIsTransitioning(true);
      
      // Store current data for comparison
      prevDataRef.current = blobFees;
      
      // Reset transition state after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [blobFees]);

  // Transform data for visualization
  const chartData = useMemo(() => {
    // Constants for blob base fee calculation
    const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477;
    const MIN_BASE_FEE_PER_BLOB_GAS = 1;
    
    // Ensure data is sorted by slot
    const sortedData = [...blobFees].sort((a, b) => a.slot - b.slot);
    
    return sortedData.map(item => {
      // Calculate blob base fee per gas using excess_blob_gas
      // If blob_base_fee is already provided and non-zero, use it
      let blobBaseFeePerGas = item.blob_base_fee;
      
      // If blob_base_fee is zero or not valid, calculate it from excess_blob_gas
      if (!blobBaseFeePerGas || blobBaseFeePerGas === 0) {
        if (item.excess_blob_gas && item.excess_blob_gas > 0) {
          // Calculate blob base fee in wei first
          const blobBaseFeeWei = MIN_BASE_FEE_PER_BLOB_GAS * Math.exp(item.excess_blob_gas / BLOB_BASE_FEE_UPDATE_FRACTION);
          // Convert to Gwei and round to integer
          blobBaseFeePerGas = Math.round(blobBaseFeeWei / 1e9);
        }
      }
      
      return {
        slot: item.slot,
        'Blob Base Fee (Gwei)': blobBaseFeePerGas || 0,
        'Excess Blob Gas': item.excess_blob_gas || 0,
      };
    });
  }, [blobFees]);

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
            if (name === 'Blob Base Fee (Gwei)') {
              value = `${value} Gwei`;
            } else if (name === 'Excess Blob Gas') {
              value = value.toLocaleString();
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
  const hasData = blobFees.length > 0;
  
  if (!hasData) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Blob Base Fee</h2>
        <p className="text-slate-300">No blob fee data available for the selected range.</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-4 text-white">Blob Base Fee</h2>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
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
              value: 'Fee per gas (Gwei)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: '#cbd5e1' },
              offset: 0
            }}
            // Format tick values as integers
            tickFormatter={(value) => {
              return value.toLocaleString();
            }}
            // Use linear scale for integer values
            scale="auto"
            // Allow zero values
            allowDecimals={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#cbd5e1' }} />
          
          <Line 
            name="Blob Base Fee"
            type="monotone"
            dataKey="Blob Base Fee (Gwei)" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(BlobBaseFeeChart); 