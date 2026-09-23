import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

export const metadata: Metadata = {
  title: 'CollabRoom — One Room. One Team. Everything Connected.',
  description: 'Secure, production-grade collaborative workspace & cloud document management platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text min-h-screen antialiased selection:bg-primary selection:text-white">
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <QueryProvider>{children}</QueryProvider>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
