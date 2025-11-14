import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Copy, Check } from 'lucide-react';

interface ConfigFormProps {
  userEmail: string;
}

export function ConfigForm({ userEmail }: ConfigFormProps) {
  const [config, setConfig] = useState({
    email: userEmail,
    secret: '',
    systemPrompt: '',
    userPrompt: '',
    apiEndpoint: '',
    githubRepo: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [userEmail]);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from('student_config')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    if (data) {
      setConfig({
        email: data.email,
        secret: data.secret || '',
        systemPrompt: data.system_prompt || '',
        userPrompt: data.user_prompt || '',
        apiEndpoint: data.api_endpoint || '',
        githubRepo: data.github_repo || '',
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('student_config')
        .upsert({
          email: config.email,
          secret: config.secret,
          system_prompt: config.systemPrompt,
          user_prompt: config.userPrompt,
          api_endpoint: config.apiEndpoint,
          github_repo: config.githubRepo,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setMessage('Configuration saved successfully!');
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copyEndpoint = () => {
    if (config.apiEndpoint) {
      navigator.clipboard.writeText(config.apiEndpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateApiEndpoint = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const endpoint = `${supabaseUrl}/functions/v1/quiz-handler`;
      setConfig({ ...config, apiEndpoint: endpoint });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Configuration</h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={config.email}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secret String
          </label>
          <input
            type="text"
            value={config.secret}
            onChange={(e) => setConfig({ ...config, secret: e.target.value })}
            placeholder="Your secret authentication string"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Prompt (max 100 chars)
          </label>
          <input
            type="text"
            value={config.systemPrompt}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value.slice(0, 100) })}
            placeholder="System prompt to resist revealing code word"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{config.systemPrompt.length}/100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Prompt (max 100 chars)
          </label>
          <input
            type="text"
            value={config.userPrompt}
            onChange={(e) => setConfig({ ...config, userPrompt: e.target.value.slice(0, 100) })}
            placeholder="User prompt to override system prompts"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{config.userPrompt.length}/100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Endpoint URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={config.apiEndpoint}
              onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
              placeholder="https://your-project.supabase.co/functions/v1/quiz-handler"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={generateApiEndpoint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
            >
              Auto-fill
            </button>
            {config.apiEndpoint && (
              <button
                type="button"
                onClick={copyEndpoint}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Repository URL
          </label>
          <input
            type="url"
            value={config.githubRepo}
            onChange={(e) => setConfig({ ...config, githubRepo: e.target.value })}
            placeholder="https://github.com/username/repo"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>

        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
