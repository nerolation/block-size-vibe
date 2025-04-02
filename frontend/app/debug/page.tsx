'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { manualResetApiFailures, getApiFailureCount } from '../api/blockService';

export default function DebugIndex() {
  const [failureCount, setFailureCount] = useState(0);
  
  useEffect(() => {
    // Update the count when component mounts
    setFailureCount(getApiFailureCount());
  }, []);
  
  const handleResetCounter = () => {
    manualResetApiFailures();
    setFailureCount(0);
    alert('API failure counter has been reset to 0');
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">API Diagnostics</h2>
          <p className="text-gray-600 mb-4">
            Test all API endpoints with detailed diagnostics and error reporting.
          </p>
          <Link 
            href="/test-diagnostics" 
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Open API Diagnostics
          </Link>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">API Fallback Test</h2>
          <p className="text-gray-600 mb-4">
            Test the API fallback mechanism to see when mock data is used vs real data.
          </p>
          <Link 
            href="/api-fallback-test" 
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Open Fallback Test
          </Link>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Main Application</h2>
          <p className="text-gray-600 mb-4">
            Return to the main block size explorer application.
          </p>
          <Link 
            href="/" 
            className="inline-block px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Go to Main App
          </Link>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Reset API Failure Counter</h2>
          <p className="text-gray-600 mb-4">
            Reset the API failure counter to force real data usage.
          </p>
          <button 
            onClick={handleResetCounter}
            className="inline-block px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Reset Counter
          </button>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current API Failure Count</h2>
        <pre className="bg-white p-3 rounded text-sm overflow-x-auto">
          API Failure Count: {failureCount}
        </pre>
      </div>
    </div>
  );
} 