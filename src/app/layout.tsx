import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FeedFlow — Gestão de Pessoas',
  description: 'FeedFlow: plataforma de gestão de pessoas com avaliação de desempenho, feedback, OKRs e muito mais.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme') || 'dark';
                document.documentElement.className = t;
              } catch {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
