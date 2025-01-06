import Image from "next/image";
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <main className="flex-1" style={{ paddingTop: '25px' }}>
        <div className="container mx-auto max-w-4xl px-4">
          <h1 className="text-3xl font-bold mb-4 text-center text-gray-900 dark:text-white">
            CyberMedAssist
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
            Your AI assistant for medical billing, coding, insurance, and practice management
          </p>
          <ChatInterface />
        </div>
      </main>
      
      <footer className="py-8 mt-8">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex gap-6 flex-wrap items-center justify-center">
            <a
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              href="https://nextjs.org/learn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/file.svg"
                alt="File icon"
                width={16}
                height={16}
                className="dark:invert"
              />
              Learn
            </a>
            <a
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              href="https://vercel.com/templates?framework=next.js"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/window.svg"
                alt="Window icon"
                width={16}
                height={16}
                className="dark:invert"
              />
              Examples
            </a>
            <a
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
                className="dark:invert"
              />
              Go to nextjs.org →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
