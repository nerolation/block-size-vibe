import { useState } from 'react';

interface RangeSelectorProps {
  currentRange: { start: number; end: number };
  onRangeChange: (range: { start: number; end: number }) => void;
  latestSlot: number;
}

const RangeSelector: React.FC<RangeSelectorProps> = ({ 
  currentRange, 
  onRangeChange,
  latestSlot
}) => {
  const [startSlot, setStartSlot] = useState<string>(currentRange.start.toString());
  const [endSlot, setEndSlot] = useState<string>(currentRange.end.toString());
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const start = parseInt(startSlot, 10);
    const end = parseInt(endSlot, 10);
    
    // Validation
    if (isNaN(start) || isNaN(end)) {
      setError('Please enter valid slot numbers');
      return;
    }
    
    if (start < 0 || end < 0) {
      setError('Slot numbers must be positive');
      return;
    }
    
    if (start > end) {
      setError('Start slot must be less than or equal to end slot');
      return;
    }
    
    if (end - start > 100) {
      setError('Maximum range is 100 slots');
      return;
    }
    
    // Clear error and update range
    setError(null);
    onRangeChange({ start, end });
  };
  
  const handleQuickRangeSelect = (range: number) => {
    const newStartSlot = Math.max(0, latestSlot - range);
    setStartSlot(newStartSlot.toString());
    setEndSlot(latestSlot.toString());
    onRangeChange({ start: newStartSlot, end: latestSlot });
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Block Range Selection</h2>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => handleQuickRangeSelect(10)}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm text-white"
        >
          Last 10 Blocks
        </button>
        <button 
          onClick={() => handleQuickRangeSelect(20)}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm text-white"
        >
          Last 20 Blocks
        </button>
        <button 
          onClick={() => handleQuickRangeSelect(50)}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm text-white"
        >
          Last 50 Blocks
        </button>
        <button 
          onClick={() => handleQuickRangeSelect(100)}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm text-white"
        >
          Last 100 Blocks
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="startSlot" className="block text-sm text-slate-300 mb-1">
            Start Slot
          </label>
          <input
            id="startSlot"
            type="number"
            value={startSlot}
            onChange={(e) => setStartSlot(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            min="0"
          />
        </div>
        
        <div>
          <label htmlFor="endSlot" className="block text-sm text-slate-300 mb-1">
            End Slot
          </label>
          <input
            id="endSlot"
            type="number"
            value={endSlot}
            onChange={(e) => setEndSlot(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            min="0"
          />
        </div>
        
        <button 
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-white"
        >
          Apply Range
        </button>
      </form>
      
      {error && (
        <div className="mt-2 text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default RangeSelector; 