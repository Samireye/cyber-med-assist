'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant' as const,
      content: "👋 Hi! I'm CyberMedAssist, your AI assistant for medical billing, coding, and practice management. Before we begin, could you please tell me your name?\n\nI'm here to help with:\n\n" +
        "• Medical billing questions and procedures\n" +
        "• ICD-10 and CPT code lookups\n" +
        "• Insurance claim assistance\n" +
        "• Practice management guidance\n\n" +
        "Once you share your name, I'll be happy to assist you with any questions in these areas!"
    }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = { role: 'user' as const, content: message };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newMessage],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      if (!data.content) {
        throw new Error('Invalid response format');
      }

      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'assistant' as const, content: data.content },
      ]);
    } catch {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant' as const,
          content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.',
        },
      ]);
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
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              )}
            >
              <ReactMarkdown 
                className={cn(
                  "prose",
                  "max-w-none",
                  "dark:prose-invert"
                )}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about medical billing, coding, or insurance..."
            className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              "bg-blue-500 text-white",
              "hover:bg-blue-600",
              "disabled:bg-gray-300 dark:disabled:bg-gray-600",
              "disabled:cursor-not-allowed"
            )}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
