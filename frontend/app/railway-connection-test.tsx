"use client";
import { useState, useEffect } from 'react';

export default function RailwayConnectionTest() {
  const [status, setStatus] = useState<string>('Testing...');
  const [healthData, setHealthData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [testResults, setTestResults] = useState<any[]>([]);

  const testUrls = [
    {
      name: 'Railway Backend',
      url: 'https://zeroprjv2-production.up.railway.app'
    },
    {
      name: 'Render Backend (Comparison)',
      url: 'https://zeroprjv2.onrender.com'
    }
  ];

  useEffect(() => {
    const testAllConnections = async () => {
      const results = [];
      
      for (const testUrl of testUrls) {
        try {
          console.log(`Testing: ${testUrl.name} - ${testUrl.url}`);
          const startTime = Date.now();
          const response = await fetch(`${testUrl.url}/health`);
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          if (response.ok) {
            const data = await response.json();
            results.push({
              name: testUrl.name,
              url: testUrl.url,
              status: 'success',
              responseTime,
              data
            });
          } else {
            results.push({
              name: testUrl.name,
              url: testUrl.url,
              status: 'error',
              responseTime,
              error: `HTTP ${response.status}: ${response.statusText}`
            });
          }
        } catch (err) {
          results.push({
            name: testUrl.name,
            url: testUrl.url,
            status: 'error',
            responseTime: null,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }
      
      setTestResults(results);
      
      // 成功した接続があれば成功として表示
      const successfulConnections = results.filter(r => r.status === 'success');
      if (successfulConnections.length > 0) {
        setStatus(`Connected successfully to ${successfulConnections.length} backend(s)!`);
        setHealthData(successfulConnections[0].data);
      } else {
        setStatus('No successful connections found');
        setError('All connection attempts failed');
      }
    };

    testAllConnections();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Railway Backend Connection Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Overall Status</h2>
          <p className={`font-mono ${status.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {status}
          </p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Connection Test Results</h2>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className={`p-3 rounded border ${
                result.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{result.name}</p>
                    <p className="font-mono text-sm text-gray-600">{result.url}</p>
                    <p className={`text-sm ${result.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      Status: {result.status}
                    </p>
                    {result.responseTime && (
                      <p className="text-sm text-gray-600">Response Time: {result.responseTime}ms</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    result.status === 'success' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {result.status === 'success' ? '✓' : '✗'}
                  </span>
                </div>
                {result.error && (
                  <p className="text-sm text-red-600 mt-1">{result.error}</p>
                )}
                {result.data && (
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {healthData && (
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Health Check Response</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="p-4 border rounded border-red-200 bg-red-50">
            <h2 className="font-semibold mb-2 text-red-800">Error</h2>
            <p className="text-red-600 font-mono text-sm">{error}</p>
          </div>
        )}

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Test Links</h2>
          <div className="space-y-2">
            {testUrls.map((testUrl, index) => (
              <div key={index}>
                <p className="font-semibold">{testUrl.name}</p>
                <div className="space-y-1 ml-4">
                  <a 
                    href={`${testUrl.url}/health`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block text-sm"
                  >
                    Health Check
                  </a>
                  <a 
                    href={`${testUrl.url}/docs`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block text-sm"
                  >
                    API Documentation
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
