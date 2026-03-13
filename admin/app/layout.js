import { Inter_Tight } from 'next/font/google';
import Image from 'next/image';
import { ClerkProvider, UserButton } from '@clerk/nextjs';
import './globals.css';

const interTight = Inter_Tight({
  weight: ['400', '500'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter-tight',
  display: 'swap',
});

export const metadata = {
  title: 'LeadLeap — База знаний',
  description: 'Управление RAG базой знаний',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={interTight.variable}>
      <body className="font-sans">
        <ClerkProvider>
          {/* Декоративный градиентный блюр */}
          <div
            className="fixed top-0 right-0 w-[400px] h-[400px] -z-[1] pointer-events-none opacity-[0.15]"
            style={{
              background: 'radial-gradient(circle, rgba(224,64,160,0.4) 0%, rgba(139,92,246,0.3) 40%, rgba(99,102,241,0.2) 70%, transparent 100%)',
              filter: 'blur(100px)',
            }}
            aria-hidden
          />

          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-10 bg-page px-4 md:px-8 py-4">
              <div className="max-w-5xl mx-auto flex items-center justify-center relative">
                <Image
                  src="/leadleap_logo.svg"
                  alt="LeadLeap"
                  width={140}
                  height={40}
                  className="h-auto w-[140px] object-contain"
                  priority
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <UserButton />
                </div>
              </div>
            </header>

          <main className="max-w-5xl mx-auto w-full px-4 md:px-8 py-8 md:py-10 flex-1 space-y-14 md:space-y-16">
            {children}
          </main>

          <footer className="border-t border-border py-6">
            <p className="text-center text-sm text-text opacity-40">
              LeadLeap © 2025
            </p>
          </footer>
        </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
