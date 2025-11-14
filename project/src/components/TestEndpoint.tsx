import { useState } from 'react';
import { Play, Loader } from 'lucide-react';

interface TestEndpointProps {
  email: string;
  secret: string;
  apiEndpoint: string;
}

export function TestEndpoint({ email, secret, apiEndpoint }: TestEndpointProps) {
  const [testUrl, setTestUrl] = useState('https://tds-llm-analysis.s-anand.net/demo');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!apiEndpoint || !secret) {
      setResult({ error: 'Please configure your API endpoint and secret first' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          secret,
          url: testUrl,
        }),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data,
      });
    } catch (error: any) {
      setResult({
        error: error.message || 'Failed to connect to endpoint',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Test Endpoint</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Quiz URL
          </label>
          <input
            type="url"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://tds-llm-analysis.s-anand.net/demo"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading || !apiEndpoint || !secret}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Test Endpoint
            </>
          )}
        </button>

        {result && (
          <div className="mt-4">
            <h3 className="font-semibold text-gray-800 mb-2">Result:</h3>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm border border-gray-200">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.status === 200 && (
              <p className="mt-2 text-sm text-green-600">
                Endpoint is working! Check the Quiz Attempts and Logs tabs for progress.
              </p>
            )}
            {result.error && (
              <p className="mt-2 text-sm text-red-600">
                {result.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
