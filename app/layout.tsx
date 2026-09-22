import type { Metadata } from 'next';
import { Frank_Ruhl_Libre, Assistant } from 'next/font/google';
import './globals.css';

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-frank-ruhl',
  display: 'swap',
});

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-assistant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'נר נשמה - לוח ימי פטירה (יארצייט) וסנכרון ליומן גוגל',
  description: 'ניהול ימי פטירה של אבות המשפחה לפי לוח השנה העברי, חלוקה לענפים וסנכרון ליומן גוגל',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${frankRuhl.variable} ${assistant.variable}`}>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
