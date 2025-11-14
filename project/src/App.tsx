import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { ConfigForm } from './components/ConfigForm';
import { QuizAttempts } from './components/QuizAttempts';
import { QuizLogs } from './components/QuizLogs';
import { TestEndpoint } from './components/TestEndpoint';
import { LogOut, Settings, List, FileText, TestTube } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'config' | 'attempts' | 'logs' | 'test'>('config');
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        if (session) {
          await loadConfig(session.user.email!);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadConfig = async (email: string) => {
    const { data } = await supabase
      .from('student_config')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    setConfig(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth onAuth={() => {}} />;
  }

  const tabs = [
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'test', label: 'Test', icon: TestTube },
    { id: 'attempts', label: 'Attempts', icon: List },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-800">LLM Analysis Quiz</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {activeTab === 'config' && <ConfigForm userEmail={session.user.email!} />}
          {activeTab === 'test' && (
            <TestEndpoint
              email={session.user.email!}
              secret={config?.secret || ''}
              apiEndpoint={config?.api_endpoint || ''}
            />
          )}
          {activeTab === 'attempts' && <QuizAttempts userEmail={session.user.email!} />}
          {activeTab === 'logs' && <QuizLogs userEmail={session.user.email!} />}
        </div>
      </div>
    </div>
  );
}

export default App;
