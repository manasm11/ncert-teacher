import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/ui/navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Outfit gives a very friendly, slightly rounded, modern look perfect for kids/learning
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

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
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased selection:bg-primary selection:text-white`}>
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
