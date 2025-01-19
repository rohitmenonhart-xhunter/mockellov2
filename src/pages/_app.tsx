import { CloudProvider } from "@/cloud/useCloud";
import "@livekit/components-styles/components/participant";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CloudProvider>
      <Head>
        {/* Basic Meta Tags */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#BE185D" />
        
        {/* Primary Meta Tags */}
        <title>Mockello - AI-Powered Candidate Evaluation Platform</title>
        <meta name="title" content="Mockello - AI-Powered Candidate Evaluation Platform" />
        <meta name="description" content="Transform your hiring process with Mockello - The most advanced AI-powered candidate evaluation platform that saves time and costs in recruitment." />
        
        {/* Favicon Tags */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#BE185D" />
        <meta name="msapplication-TileColor" content="#BE185D" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mockello.com/" />
        <meta property="og:title" content="Mockello - AI-Powered Candidate Evaluation Platform" />
        <meta property="og:description" content="Transform your hiring process with Mockello - The most advanced AI-powered candidate evaluation platform that saves time and costs in recruitment." />
        <meta property="og:image" content="https://mockello.com/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://mockello.com/" />
        <meta property="twitter:title" content="Mockello - AI-Powered Candidate Evaluation Platform" />
        <meta property="twitter:description" content="Transform your hiring process with Mockello - The most advanced AI-powered candidate evaluation platform that saves time and costs in recruitment." />
        <meta property="twitter:image" content="https://mockello.com/twitter-card.png" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Mockello",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "AI-powered candidate evaluation platform that transforms the hiring process",
            "offers": {
              "@type": "Offer",
              "category": "Premium Software"
            },
            "logo": "https://mockello.com/android-chrome-512x512.png",
            "image": "https://mockello.com/og-image.png",
            "url": "https://mockello.com",
            "author": {
              "@type": "Organization",
              "name": "Mockello",
              "logo": "https://mockello.com/android-chrome-512x512.png"
            }
          })}
        </script>
      </Head>
      <Component {...pageProps} />
    </CloudProvider>
  );
}
