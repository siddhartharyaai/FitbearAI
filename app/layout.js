import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: 'Fitbear AI - Indian Health & Nutrition Coach',
  description: 'AI-powered nutrition coach for Indian diet. Scan menus, get personalized recommendations, and chat with Coach C.',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#22c55e" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }

            // PWA Install Prompt
            let deferredPrompt;
            let installPromptShown = sessionStorage.getItem('installPromptShown');

            window.addEventListener('beforeinstallprompt', (e) => {
              e.preventDefault();
              deferredPrompt = e;
              
              if (!installPromptShown) {
                showInstallPrompt();
              }
            });

            function showInstallPrompt() {
              const installBanner = document.createElement('div');
              installBanner.innerHTML = \`
                <div style="position: fixed; top: 0; left: 0; right: 0; background: #22c55e; color: white; padding: 12px; text-align: center; z-index: 9999; font-family: system-ui;">
                  <div style="max-width: 600px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
                    <span>📱 Install Fitbear AI for quick access!</span>
                    <div>
                      <button id="installBtn" style="background: white; color: #22c55e; border: none; padding: 6px 12px; border-radius: 4px; margin-right: 8px; cursor: pointer;">Install</button>
                      <button id="dismissBtn" style="background: transparent; color: white; border: 1px solid white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Later</button>
                    </div>
                  </div>
                </div>
              \`;
              
              document.body.appendChild(installBanner);
              
              document.getElementById('installBtn').onclick = async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  deferredPrompt = null;
                }
                installBanner.remove();
                sessionStorage.setItem('installPromptShown', 'true');
              };
              
              document.getElementById('dismissBtn').onclick = () => {
                installBanner.remove();
                sessionStorage.setItem('installPromptShown', 'true');
              };
            }

            // Hide install prompt if already installed
            window.addEventListener('appinstalled', () => {
              sessionStorage.setItem('installPromptShown', 'true');
            });
          `
        }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}