import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "../hooks/useAuth";
import "../styles/globals.css";

import { ToastProvider } from "../hooks/useToast";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata: Metadata = {
  title: "ACAD LAN - Academic Assessment Platform",
  description: "Offline-first LAN examination platform",
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self';"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#92400E" />
        <script dangerouslySetInnerHTML={{__html:`try {
          var key=location.pathname.startsWith('/student')?'acqad_student_theme':location.pathname.startsWith('/guardian')?'acad_guardian_theme':'acqad_theme';
          var saved=localStorage.getItem(key)||localStorage.getItem('acqad_theme');
          var theme=saved==='dark'||saved==='light'?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
          document.documentElement.dataset.theme=theme;
          document.documentElement.classList.toggle('dark',theme==='dark');
          document.documentElement.style.colorScheme=theme;
        } catch(e) {}`}}/>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    registration.update();
                    console.log('SW updated with scope:', registration.scope);
                  }, function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-system">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
