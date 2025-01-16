import Head from 'next/head';

interface SharedHeadProps {
  title: string;
  description: string;
}

export default function SharedHead({ title, description }: SharedHeadProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Basic Favicon */}
      <link rel="icon" href="/favicon.svg" />
      
      {/* Fallback ICO */}
      <link rel="alternate icon" href="/favicon.ico" />
      
      {/* Apple Touch Icon */}
      <link rel="apple-touch-icon" href="/favicon.svg" />
      
      {/* Theme Color */}
      <meta name="theme-color" content="#BE185D" />
      <meta name="msapplication-TileColor" content="#BE185D" />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/favicon.svg" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content="/favicon.svg" />
    </Head>
  );
} 