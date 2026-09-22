import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'לוח ימי פטירה (יארצייט) המשפחתי | סנכרון ליומן גוגל',
  description: 'ניהול ימי פטירה של אבות המשפחה לפי לוח השנה העברי, חלוקה לענפים וסנכרון ליומן גוגל',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
