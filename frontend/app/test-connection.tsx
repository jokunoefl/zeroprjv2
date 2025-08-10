"use client";
import { useState, useEffect } from 'react';

export default function TestConnection() {
  const [status, setStatus] = useState<string>('Testing...');
  const [healthData, setHealthData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

  useEffect(() => {
    const testConnection = async () => {
      try {
        // ヘルスチェック
        const healthResponse = await fetch(`${API_BASE}/health`);
        if (healthResponse.ok) {
          const healthJson = await healthResponse.json();
          setHealthData(healthJson);
          setStatus('Connected successfully!');
        } else {
          setStatus('Health check failed');
          setError(`Status: ${healthResponse.status}`);
        }
      } catch (err) {
        setStatus('Connection failed');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testConnection();
  }, [API_BASE]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Backend Connection Test</h1>
      
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
          <p className="font-mono text-sm">API Base: {API_BASE}</p>
        </div>
      </div>
    </div>
  );
}
