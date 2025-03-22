import { Block } from '../api/blockService';

interface HeaderProps {
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  latestBlock?: Block;
}

const Header: React.FC<HeaderProps> = ({ autoRefresh, onToggleAutoRefresh, latestBlock }) => {
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <header className="border-b border-slate-700 pb-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Ethereum Block Size Dashboard
          </h1>
          <p className="text-slate-400 text-sm">
            Visualizing Beacon chain block sizes and compression metrics
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center">
          <button
            onClick={onToggleAutoRefresh}
            className={`px-3 py-1.5 rounded-md text-sm mr-4 border ${
              autoRefresh 
                ? 'bg-emerald-800 border-emerald-600 text-white' 
                : 'bg-transparent border-slate-600 text-slate-300'
            }`}
          >
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </button>
          
          {latestBlock && (
            <div className="text-sm text-slate-400">
              <div>
                Latest Block: <span className="text-white font-medium">{latestBlock.slot}</span>
              </div>
              <div>
                Time: <span className="text-white">{formatTimestamp(latestBlock.timestamp)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 