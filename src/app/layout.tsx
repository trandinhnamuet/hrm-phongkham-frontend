import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'HRM Phòng Khám',
  description: 'Hệ thống quản lý nội bộ phòng khám nha khoa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-[#F9F9F9]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
