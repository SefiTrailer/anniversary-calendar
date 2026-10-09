import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: 'זמנים משפחתיים - לוח שנה משפחתי | ימי זיכרון, שמחות ועץ משפחה',
  description: 'זמנים משפחתיים — לוח שנה משפחתי עברי: ניהול ימי זיכרון (יארצייט מצאת הכוכבים עד השקיעה), ימי הולדת, ימי נישואין ושמחות, וסנכרון ליומן גוגל בשני צבעים',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'זמנים משפחתיים',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg?v=3', type: 'image/svg+xml', sizes: 'any' },
      { url: '/favicon.png?v=3', type: 'image/png', sizes: '64x64' },
      { url: '/favicon.ico?v=3', sizes: '64x64' },
    ],
    shortcut: ['/favicon.ico?v=3'],
    apple: [{ url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' }],
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
