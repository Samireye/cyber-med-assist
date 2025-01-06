'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatInterface() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm CyberMedAssist, your AI assistant for medical billing, coding, and practice management. Before we begin, could you please tell me your name?\n\nI'm here to help with:\n\n" +
        "• Medical billing questions and procedures\n" +
        "• ICD-10 and CPT code lookups\n" +
        "• Insurance claim assistance\n" +
        "• Practice management guidance\n\n" +
        "Once you share your name, I'll be happy to assist you with any questions in these areas!"
    }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage: Message = { role: 'user', content: message };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setMessage('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, newMessage] }),
      });

      const data = await response.json() as { response?: string; error?: string };
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      if (data.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response
        };
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      }
    } catch (error) {
      const e = error as Error;
      console.error('Error:', e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all h-[600px]">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            Ask me anything about medical billing, coding, or insurance!
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={cn(
              "flex w-full",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 transition-colors",
                msg.role === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              )}
            >
              <ReactMarkdown 
                className={cn(
                  "prose max-w-none",
                  msg.role === 'user' 
                    ? "prose-invert" 
                    : theme === 'dark' ? "prose-invert" : "prose"
                )}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 text-gray-500 dark:text-gray-400 transition-colors">
              <div className="flex space-x-2 items-center">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 transition-colors">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about medical billing, coding, or insurance..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "px-6 py-3 rounded-xl font-semibold transition-colors",
              isLoading
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            )}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
