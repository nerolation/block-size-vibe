import { Block } from '../api/blockService';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface BlockSizeMetricsProps {
  blocks: Block[];
}

const BlockSizeMetrics: React.FC<BlockSizeMetricsProps> = ({ blocks }) => {
  // Calculate average metrics
  const avgSszSize = blocks.reduce((sum, block) => sum + block.ssz_size, 0) / blocks.length;
  const avgSnappySize = blocks.reduce((sum, block) => sum + block.snappy_size, 0) / blocks.length;
  const avgCompressionRatio = blocks.reduce((sum, block) => sum + block.compression_ratio, 0) / blocks.length;
  
  // Calculate total component sizes across all blocks
  const componentTotals: Record<string, number> = {};
  
  blocks.forEach(block => {
    Object.entries(block.components).forEach(([key, value]) => {
      if (!componentTotals[key]) {
        componentTotals[key] = 0;
      }
      componentTotals[key] += value;
    });
  });
  
  // Prepare data for pie chart
  const pieData = Object.entries(componentTotals)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value: Math.round(value / blocks.length),
    }))
    .sort((a, b) => b.value - a.value);
  
  // Colors for pie chart
  const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', 
    '#84cc16', '#14b8a6', '#06b6d4', '#6366f1'
  ];
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg h-full">
      <h2 className="text-xl font-semibold mb-4 text-white">Block Metrics</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-slate-400 text-sm">Avg SSZ Size</p>
          <p className="text-xl font-bold text-white">{formatBytes(avgSszSize)}</p>
        </div>
        <div className="text-center">
          <p className="text-slate-400 text-sm">Avg Snappy Size</p>
          <p className="text-xl font-bold text-white">{formatBytes(avgSnappySize)}</p>
        </div>
        <div className="text-center">
          <p className="text-slate-400 text-sm">Avg Compression</p>
          <p className="text-xl font-bold text-white">{(avgCompressionRatio * 100).toFixed(1)}%</p>
        </div>
      </div>
      
      <h3 className="text-lg font-medium mb-2 text-white">Component Breakdown</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatBytes(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px' }}
              labelStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BlockSizeMetrics; 