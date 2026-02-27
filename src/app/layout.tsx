import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/ui/navbar';

export const metadata: Metadata = {
  title: 'Gyanu AI | Your Friendly Forest Tutor',
  description: 'Learn NCERT interactively with Gyanu the Elephant!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Outfit:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased selection:bg-primary selection:text-white">
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
