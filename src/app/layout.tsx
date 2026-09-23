import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nemotron Domain Studio',
  description: 'Customize and run domain-specialized Nemotron models locally on NVIDIA DGX Station.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
