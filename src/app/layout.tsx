import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Plataforma RH — Gestão de Pessoas',
  description: 'Plataforma de gestão de pessoas: avaliação de desempenho, feedback, OKRs e muito mais.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 min-h-screen`}>{children}</body>
    </html>
  );
}
