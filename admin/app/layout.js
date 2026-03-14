import { Inter_Tight } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Sidebar } from '@/components/sidebar';

const interTight = Inter_Tight({
  weight: ['400', '500'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter-tight',
  display: 'swap',
});

export const metadata = {
  title: 'Leapy',
  description: 'AI-сервис для анализа звонков и генерации креативов',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${interTight.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <div className="h-screen flex overflow-hidden bg-background">
            <Sidebar />

            {/* Main content */}
            <main className="flex-1 min-h-0 flex flex-col">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
