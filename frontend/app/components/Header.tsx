import { Block } from '../api/blockService';
import React from 'react';

interface HeaderProps {
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  latestBlock?: Block;
  isUpdating?: boolean;
}

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const Header: React.FC<HeaderProps> = ({ autoRefresh, onToggleAutoRefresh, latestBlock, isUpdating }) => {
  return (
    <header className="bg-slate-800 p-4 rounded-lg shadow-lg flex flex-col md:flex-row md:items-center justify-between">
      <div className="mb-4 md:mb-0">
        <h1 className="text-2xl font-bold text-white">Ethereum Block Size Explorer</h1>
        <p className="text-slate-400 text-sm">
          Visualizing block size metrics from an Ethereum beacon node
        </p>
      </div>
      
      <div className="flex flex-col items-end space-y-2">
        {latestBlock && (
          <div className="text-right">
            <p className="text-sm text-slate-400">
              Latest Block: <span className="text-white font-medium">{latestBlock.slot}</span>
              {isUpdating && (
                <span className="ml-2 inline-block animate-pulse text-blue-400">
                  Updating...
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              {formatTimestamp(latestBlock.timestamp)}
            </p>
          </div>
        )}
        
        <button 
          onClick={onToggleAutoRefresh}
          className={`flex items-center text-sm rounded px-3 py-1 
            ${autoRefresh 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
        >
          <span className={`w-2 h-2 rounded-full mr-2 ${autoRefresh ? 'bg-green-300' : 'bg-slate-500'}`}></span>
          {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
        </button>
      </div>
    </header>
  );
};

export default React.memo(Header); 