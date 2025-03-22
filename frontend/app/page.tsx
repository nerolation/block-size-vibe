'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLatestBlock, fetchBlocks } from './api/blockService';
import BlockSizeChart from './components/BlockSizeChart';
import BlockSizeMetrics from './components/BlockSizeMetrics';
import BlockList from './components/BlockList';
import RangeSelector from './components/RangeSelector';
import Header from './components/Header';

export default function Home() {
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Query for the latest block
  const latestBlockQuery = useQuery({
    queryKey: ['latestBlock'],
    queryFn: fetchLatestBlock,
    refetchInterval: autoRefresh ? 12000 : false,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Set the initial range when we get the latest block
  useEffect(() => {
    if (latestBlockQuery.data && !range) {
      const latestSlot = latestBlockQuery.data.slot;
      setRange({
        start: Math.max(0, latestSlot - 20),
        end: latestSlot
      });
    }
  }, [latestBlockQuery.data, range]);

  // Query for blocks in range
  const blocksQuery = useQuery({
    queryKey: ['blocks', range?.start, range?.end],
    queryFn: () => range ? fetchBlocks(range.start, range.end) : Promise.resolve([]),
    enabled: !!range,
    refetchInterval: autoRefresh ? 12000 : false,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const blocks = blocksQuery.data || [];
  const isLoading = latestBlockQuery.isLoading || blocksQuery.isLoading;
  const isError = latestBlockQuery.isError || blocksQuery.isError;

  const handleRangeChange = (newRange: { start: number; end: number }) => {
    setRange(newRange);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <Header 
        autoRefresh={autoRefresh} 
        onToggleAutoRefresh={toggleAutoRefresh}
        latestBlock={latestBlockQuery.data}
      />
      
      {isLoading && <div className="text-center mt-12">Loading block data...</div>}
      
      {isError && (
        <div className="text-center mt-12 text-red-500">
          <p className="text-xl mb-2">Error loading block data</p>
          <p className="mb-4">Please check your connection to the beacon node.</p>
          <p className="text-sm text-slate-400">
            Make sure an Ethereum beacon node is running at the URL configured in your backend .env file 
            (default: http://localhost:5052). You may need to start a beacon node or update the URL.
          </p>
        </div>
      )}

      {!isLoading && !isError && blocks.length > 0 && (
        <div className="mt-8 space-y-8">
          <RangeSelector 
            currentRange={range!} 
            onRangeChange={handleRangeChange}
            latestSlot={latestBlockQuery.data?.slot || 0} 
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BlockSizeChart blocks={blocks} />
            </div>
            <div>
              <BlockSizeMetrics blocks={blocks} />
            </div>
          </div>
          
          <BlockList blocks={blocks} />
        </div>
      )}
      
      {!isLoading && !isError && blocks.length === 0 && (
        <div className="text-center mt-12 text-amber-500">
          <p className="text-xl mb-2">No block data available</p>
          <p className="mb-4">No blocks were found in the selected range.</p>
          <p className="text-sm text-slate-400">
            Try selecting a different slot range or check your beacon node configuration.
          </p>
        </div>
      )}
    </main>
  );
}
