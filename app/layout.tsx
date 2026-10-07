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
  title: 'זמנים משפחתיים - לוח שנה משפחתי | ימי זיכרון, שמחות ועץ משפחה',
  description: 'זמנים משפחתיים — לוח שנה משפחתי עברי: ניהול ימי זיכרון (יארצייט מצאת הכוכבים עד השקיעה), ימי הולדת, ימי נישואין ושמחות, וסנכרון ליומן גוגל בשני צבעים',
  icons: {
    icon: [
      { url: '/favicon.svg?v=2', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: ['/favicon.svg?v=2'],
    apple: ['/favicon.svg?v=2'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${frankRuhl.variable} ${assistant.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
        <link rel="shortcut icon" href="/favicon.svg?v=2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=window.location.hostname;if(h&&h!=='family-zmanim.vercel.app'&&h!=='localhost'&&h!=='127.0.0.1'){window.location.replace('https://family-zmanim.vercel.app'+window.location.pathname+window.location.search+window.location.hash);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
