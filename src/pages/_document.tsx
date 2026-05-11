import { Html, Head, Main, NextScript } from "next/document";

const themeInitScript = `
(() => {
  try {
    const storedTheme = window.localStorage.getItem("theme");
    // Default to dark mode for premium AI platform feel
    // User can toggle to light via the theme switcher — their preference is persisted
    const isDark = storedTheme ? storedTheme === "dark" : true;
    document.documentElement.classList.toggle("dark", isDark);
    if (!storedTheme) window.localStorage.setItem("theme", "dark");
  } catch (_) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* CMS preconnect for faster image/data loading */}
        {process.env.NEXT_PUBLIC_CMS_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_CMS_URL.replace(/\/$/, "")} crossOrigin="anonymous" />
        )}
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-F9YN432TTH" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-F9YN432TTH');
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
