"use client";
import { useState, useEffect } from 'react';

export default function ProductionTest() {
  const [status, setStatus] = useState<string>('Testing...');
  const [healthData, setHealthData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [apiBase, setApiBase] = useState<string>('');

  useEffect(() => {
    // 環境変数からAPI_BASEを取得
    const envApiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
    setApiBase(envApiBase);

    const testConnection = async () => {
      try {
        console.log('Testing connection to:', envApiBase);
        
        // ヘルスチェック
        const healthResponse = await fetch(`${envApiBase}/health`);
        console.log('Health response status:', healthResponse.status);
        
        if (healthResponse.ok) {
          const healthJson = await healthResponse.json();
          setHealthData(healthJson);
          setStatus('Connected successfully!');
        } else {
          setStatus('Health check failed');
          setError(`Status: ${healthResponse.status} - ${healthResponse.statusText}`);
        }
      } catch (err) {
        console.error('Connection error:', err);
        setStatus('Connection failed');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Production Backend Connection Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Connection Status</h2>
          <p className={`font-mono ${status.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {status}
          </p>
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
          <h2 className="font-semibold mb-2">Configuration</h2>
          <p className="font-mono text-sm">API Base: {apiBase}</p>
          <p className="font-mono text-sm">Environment: {process.env.NODE_ENV}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Test Links</h2>
          <div className="space-y-2">
            <a 
              href={`${apiBase}/health`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline block"
            >
              Health Check (Direct)
            </a>
            <a 
              href={`${apiBase}/docs`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline block"
            >
              API Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
