'use client'

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { manualResetApiFailures, getApiFailureCount } from '../api/blockService';

type TestResult = {
  endpoint: string;
  success: boolean;
  error?: string;
  data?: any;
  timestamp: number;
  latency: number;
};

export default function Diagnostics() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({
    baseUrl: API_BASE_URL,
    timeout: 5000
  });

  const endpoints = [
    '/cors-test',
    '/debug',
    '/env-check',
    '/beacon-connectivity',
    '/latest'
  ];

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    
    const testResults: TestResult[] = [];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        // Clear previous API failure counter to ensure clean test
        manualResetApiFailures();
        
        console.log(`Testing endpoint: ${config.baseUrl}${endpoint}`);
        
        const response = await axios.get(`${config.baseUrl}${endpoint}`, {
          timeout: config.timeout
        });
        
        const latency = Date.now() - startTime;
        
        testResults.push({
          endpoint,
          success: true,
          data: response.data,
          timestamp: Date.now(),
          latency
        });
        
        console.log(`Endpoint ${endpoint} success in ${latency}ms`);
      } catch (err) {
        const latency = Date.now() - startTime;
        console.error(`Error testing ${endpoint}:`, err);
        
        let errorMessage = 'Unknown error';
        if (axios.isAxiosError(err)) {
          if (err.response) {
            errorMessage = `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`;
          } else if (err.request) {
            errorMessage = `No response received (network error): ${err.message}`;
          } else {
            errorMessage = `Request setup error: ${err.message}`;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        testResults.push({
          endpoint,
          success: false,
          error: errorMessage,
          timestamp: Date.now(),
          latency
        });
      }
    }
    
    setResults(testResults);
    setLoading(false);
  };

  // Run tests on page load
  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Diagnostics</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">API Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({...config, baseUrl: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
            <input
              type="number"
              value={config.timeout}
              onChange={(e) => setConfig({...config, timeout: parseInt(e.target.value)})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Test Results</h2>
        {loading && <p className="text-gray-500">Running tests...</p>}
        
        {results.map((result, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
          >
            <h3 className="font-semibold flex justify-between">
              <span>{result.endpoint}</span>
              <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                {result.success ? 'Success' : 'Failed'} ({result.latency}ms)
              </span>
            </h3>
            
            {result.error && (
              <div className="mt-2">
                <h4 className="font-medium text-red-700">Error</h4>
                <pre className="mt-1 text-sm bg-red-100 p-2 rounded overflow-x-auto">
                  {result.error}
                </pre>
              </div>
            )}
            
            {result.success && (
              <div className="mt-2">
                <h4 className="font-medium text-green-700">Response Data</h4>
                <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto max-h-60 overflow-y-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Browser Information</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
          {`User Agent: ${navigator.userAgent}
App API URL: ${process.env.NEXT_PUBLIC_API_URL || 'Not set (using default)'}
Current URL: ${typeof window !== 'undefined' ? window.location.href : 'Not available'}
API Failure Count: ${getApiFailureCount()}`}
        </pre>
      </div>
    </div>
  );
} 