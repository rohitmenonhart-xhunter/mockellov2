import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Standard favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        
        {/* Modern browsers */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* Web App Manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#BE185D" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#BE185D" />
        
        {/* PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        
        {/* SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="google" content="notranslate" />
        <link rel="canonical" href="https://mockello.com" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Mockello" />
        <meta property="og:image" content="https://mockello.com/og-image.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@mockello" />
        <meta name="twitter:image" content="https://mockello.com/og-image.jpg" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Mockello",
              "url": "https://mockello.com",
              "logo": "https://mockello.com/favicon.svg",
              "sameAs": [
                "https://twitter.com/mockello",
                "https://linkedin.com/company/mockello"
              ],
              "description": "AI-Powered Candidate Evaluation Platform for Modern Recruitment"
            })
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
