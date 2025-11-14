import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

interface QuizAttempt {
  id: string;
  quiz_url: string;
  question: string;
  answer: any;
  correct: boolean;
  response: any;
  attempt_time: string;
  duration_ms: number;
}

interface QuizAttemptsProps {
  userEmail: string;
}

export function QuizAttempts({ userEmail }: QuizAttemptsProps) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttempts();
    const subscription = supabase
      .channel('quiz_attempts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_attempts',
          filter: `email=eq.${userEmail}`,
        },
        () => {
          loadAttempts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userEmail]);

  const loadAttempts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('email', userEmail)
      .order('attempt_time', { ascending: false });

    if (data) {
      setAttempts(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Loading attempts...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Quiz Attempts</h2>

      {attempts.length === 0 ? (
        <p className="text-gray-600">No quiz attempts yet</p>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {attempt.correct ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${attempt.correct ? 'text-green-600' : 'text-red-600'}`}>
                    {attempt.correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{attempt.duration_ms}ms</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <a
                    href={attempt.quiz_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {attempt.quiz_url}
                  </a>
                </div>

                {attempt.question && (
                  <div>
                    <span className="font-medium text-gray-700">Question:</span>
                    <p className="text-gray-600 mt-1 whitespace-pre-wrap">{attempt.question.slice(0, 200)}{attempt.question.length > 200 ? '...' : ''}</p>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-700">Answer:</span>
                  <p className="text-gray-600 mt-1">
                    {typeof attempt.answer === 'object'
                      ? JSON.stringify(attempt.answer)
                      : String(attempt.answer)}
                  </p>
                </div>

                {attempt.response?.reason && (
                  <div>
                    <span className="font-medium text-gray-700">Reason:</span>
                    <p className="text-gray-600 mt-1">{attempt.response.reason}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2">
                  {new Date(attempt.attempt_time).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
