import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "创作助手 - Telegram Mini App",
  description: "自媒体创作助手 Telegram 小程序",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TelegramMiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="antialiased bg-background text-foreground">
        <TelegramThemeAdapter />
        {children}
      </body>
    </html>
  );
}

function TelegramThemeAdapter() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var tg = window.Telegram?.WebApp;
            if (!tg) return;
            tg.ready();
            tg.expand();

            // Adapt to Telegram theme
            var theme = tg.themeParams;
            if (theme) {
              var root = document.documentElement;
              if (theme.bg_color) root.style.setProperty('--background', theme.bg_color);
              if (theme.text_color) root.style.setProperty('--foreground', theme.text_color);
              if (theme.button_color) root.style.setProperty('--primary', theme.button_color);
              if (theme.button_text_color) root.style.setProperty('--primary-foreground', theme.button_text_color);

              // Dark mode detection
              if (tg.colorScheme === 'dark') {
                document.documentElement.classList.add('dark');
              }
            }
          })();
        `,
      }}
    />
  );
}
