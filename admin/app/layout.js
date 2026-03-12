import './globals.css';

export const metadata = {
  title: 'LeadLeap — База знаний',
  description: 'Управление RAG базой знаний',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen">
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-6 py-4">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                LeadLeap —{' '}
                <span className="text-blue-600">База знаний</span>
              </h1>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
