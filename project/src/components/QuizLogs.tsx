import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface QuizLog {
  id: string;
  quiz_url: string;
  log_level: string;
  message: string;
  metadata: any;
  created_at: string;
}

interface QuizLogsProps {
  userEmail: string;
}

export function QuizLogs({ userEmail }: QuizLogsProps) {
  const [logs, setLogs] = useState<QuizLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
    const subscription = supabase
      .channel('quiz_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_logs',
          filter: `email=eq.${userEmail}`,
        },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userEmail]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_logs')
      .select('*')
      .eq('email', userEmail)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(
    (log) => filter === 'all' || log.log_level === filter
  );

  const getIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />;
      case 'debug':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTextColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
      case 'debug':
        return 'text-yellow-800';
      default:
        return 'text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading logs...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quiz Logs</h2>
        <div className="flex gap-2">
          {['all', 'info', 'error', 'debug'].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filter === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="text-gray-600">No logs to display</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {getIcon(log.log_level)}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`font-medium text-sm ${getTextColor(log.log_level)}`}>
                    {log.message}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                      View details
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
