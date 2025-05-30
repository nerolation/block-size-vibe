'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLatestBlock, fetchBlocks, fetchBlobsRange, fetchBlobFeesRange, Block, BlockBlobs, BlobFeeData } from './api/blockService';
import BlockSizeChart from './components/BlockSizeChart';
import BlockSizeMetrics from './components/BlockSizeMetrics';
import BlockList from './components/BlockList';
import BlobTable from './components/BlobTable';
import BlobChart from './components/BlobChart';
import BlobBaseFeeChart from './components/BlobBaseFeeChart';
import RangeSelector from './components/RangeSelector';
import Header from './components/Header';
import UpdateCountdown from './components/UpdateCountdown';
import BlockComponentsTable from './components/BlockComponentsTable';
import Tabs from './components/Tabs';

// Auto-refresh interval in milliseconds (12 seconds)
const AUTO_REFRESH_INTERVAL = 12000;

export default function Home() {
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPending, startTransition] = useTransition();
  const prevBlocksRef = useRef<Block[]>([]);
  const prevBlobsRef = useRef<BlockBlobs[]>([]);
  const prevBlobFeesRef = useRef<BlobFeeData[]>([]);
  
  // Query for the latest block
  const latestBlockQuery = useQuery({
    queryKey: ['latestBlock'],
    queryFn: fetchLatestBlock,
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5000,
    refetchOnMount: false,
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

  // Auto-update range to follow latest block when autoRefresh is enabled
  useEffect(() => {
    if (autoRefresh && latestBlockQuery.data && range) {
      const latestSlot = latestBlockQuery.data.slot;
      const currentRangeSize = range.end - range.start;
      
      // Only update if the latest slot is beyond our current range
      if (latestSlot > range.end) {
        startTransition(() => {
          setRange({
            start: Math.max(0, latestSlot - currentRangeSize),
            end: latestSlot
          });
        });
      }
    }
  }, [latestBlockQuery.data, autoRefresh, range]);

  // Query for blocks in range
  const blocksQuery = useQuery({
    queryKey: ['blocks', range?.start, range?.end],
    queryFn: () => range ? fetchBlocks(range.start, range.end) : Promise.resolve([]),
    enabled: !!range,
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5000,
    refetchOnMount: false,
  });

  // Query for blobs in range
  const blobsQuery = useQuery({
    queryKey: ['blobs', range?.start, range?.end],
    queryFn: () => range ? fetchBlobsRange(range.start, range.end) : Promise.resolve([]),
    enabled: !!range,
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5000,
    refetchOnMount: false,
  });
  
  // Query for blob fees in range
  const blobFeesQuery = useQuery({
    queryKey: ['blobFees', range?.start, range?.end],
    queryFn: () => range ? fetchBlobFeesRange(range.start, range.end) : Promise.resolve([]),
    enabled: !!range,
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5000,
    refetchOnMount: false,
  });
  
  // Store previous successful blocks data
  useEffect(() => {
    if (blocksQuery.data && blocksQuery.data.length > 0) {
      prevBlocksRef.current = blocksQuery.data;
    }
  }, [blocksQuery.data]);

  // Store previous successful blobs data
  useEffect(() => {
    if (blobsQuery.data && blobsQuery.data.length > 0) {
      prevBlobsRef.current = blobsQuery.data;
    }
  }, [blobsQuery.data]);

  // Store previous successful blob fees data
  useEffect(() => {
    if (blobFeesQuery.data && blobFeesQuery.data.length > 0) {
      prevBlobFeesRef.current = blobFeesQuery.data;
    }
  }, [blobFeesQuery.data]);

  // Use previous data during loading states to prevent blinking
  const blocks = blocksQuery.isLoading && prevBlocksRef.current.length > 0 
    ? prevBlocksRef.current 
    : blocksQuery.data || [];

  const blobs = blobsQuery.isLoading && prevBlobsRef.current.length > 0
    ? prevBlobsRef.current
    : blobsQuery.data || [];

  const blobFees = blobFeesQuery.isLoading && prevBlobFeesRef.current.length > 0
    ? prevBlobFeesRef.current
    : blobFeesQuery.data || [];

  const isLoading = 
    (latestBlockQuery.isLoading && !latestBlockQuery.data) || 
    (blocksQuery.isLoading && !blocksQuery.data && prevBlocksRef.current.length === 0) ||
    (blobsQuery.isLoading && !blobsQuery.data && prevBlobsRef.current.length === 0) ||
    (blobFeesQuery.isLoading && !blobFeesQuery.data && prevBlobFeesRef.current.length === 0);
    
  const isError = 
    latestBlockQuery.isError || 
    blocksQuery.isError ||
    blobsQuery.isError ||
    blobFeesQuery.isError;

  const handleRangeChange = (newRange: { start: number; end: number }) => {
    startTransition(() => {
      setRange(newRange);
    });
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Define tab content
  const renderBlocksTab = () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BlockSizeChart blocks={blocks} />
        </div>
        <div>
          <BlockSizeMetrics blocks={blocks} />
        </div>
      </div>
      
      <div className="bg-slate-900/50 rounded-lg p-6 mt-8">
        <BlockComponentsTable blocks={blocks} />
      </div>
      
      <div className="mt-8">
        <BlockList blocks={blocks} />
      </div>
    </>
  );

  const renderBlobsTab = () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <BlobChart blockBlobs={blobs} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="lg:col-span-2">
          <BlobBaseFeeChart blobFees={blobFees} />
        </div>
      </div>
      
      <div className="mt-8">
        <BlobTable blockBlobs={blobs} />
      </div>
    </>
  );

  return (
    <main className={`min-h-screen p-4 md:p-8 transition-opacity duration-300 ${isPending ? 'opacity-70' : 'opacity-100'} pb-24`}>
      <Header 
        autoRefresh={autoRefresh} 
        onToggleAutoRefresh={toggleAutoRefresh}
        latestBlock={latestBlockQuery.data}
        isUpdating={isPending || blocksQuery.isFetching || blobsQuery.isFetching || blobFeesQuery.isFetching}
      />
      
      {isLoading && <div className="text-center mt-12">Loading block data...</div>}
      
      {isError && (
        <div className="text-center mt-12 text-red-500">
          <p className="text-xl mb-2">Error loading block data</p>
          <p className="mb-4">
            There was an error connecting to the Ethereum nodes. This may be due to network issues or the node might be busy.
          </p>
          <p className="text-sm text-slate-400 mb-2">
            Error details:
          </p>
          <div className="bg-slate-900 p-4 rounded-lg max-w-2xl mx-auto text-left text-sm text-slate-300 mb-4 overflow-auto">
            {latestBlockQuery.error ? (
              <pre>{JSON.stringify(latestBlockQuery.error, null, 2)}</pre>
            ) : blocksQuery.error ? (
              <pre>{JSON.stringify(blocksQuery.error, null, 2)}</pre>
            ) : blobsQuery.error ? (
              <pre>{JSON.stringify(blobsQuery.error, null, 2)}</pre>
            ) : (
              <pre>{JSON.stringify(blobFeesQuery.error, null, 2)}</pre>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Please check the node configuration or try again later when the node is less busy.
          </p>
        </div>
      )}

      {!isLoading && !isError && blocks.length > 0 && (
        <div className="mt-8 space-y-8">
          <RangeSelector 
            currentRange={range!} 
            onRangeChange={handleRangeChange}
            latestSlot={latestBlockQuery.data?.slot || 0}
            isPending={isPending} 
          />
          
          <Tabs
            tabs={[
              {
                id: 'blocks',
                label: 'Blocks',
                content: renderBlocksTab()
              },
              {
                id: 'blobs',
                label: 'Blobs',
                content: renderBlobsTab()
              }
            ]}
            defaultTabId="blocks"
          />
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
      
      {/* Countdown timer for next update */}
      <UpdateCountdown 
        autoRefresh={autoRefresh} 
        interval={AUTO_REFRESH_INTERVAL} 
      />
    </main>
  );
}
