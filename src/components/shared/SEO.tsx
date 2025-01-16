import Head from 'next/head';
import { useRouter } from 'next/router';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  noindex?: boolean;
}

export default function SEO({
  title,
  description,
  keywords = "AI interview, recruitment platform, candidate evaluation, HR tech, automated interviews",
  ogImage = "https://mockello.com/og-image.jpg",
  noindex = false
}: SEOProps) {
  const router = useRouter();
  const canonicalUrl = `https://mockello.com${router.asPath}`;
  
  // Ensure title ends with site name
  const fullTitle = title.includes('Mockello') ? title : `${title} - Mockello`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Robots */}
      <meta 
        name="robots" 
        content={noindex ? "noindex, nofollow" : "index, follow"} 
      />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Article Schema */}
      {router.pathname.startsWith('/blog/') && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": title,
              "description": description,
              "image": ogImage,
              "publisher": {
                "@type": "Organization",
                "name": "Mockello",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://mockello.com/favicon.svg"
                }
              },
              "url": canonicalUrl,
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": canonicalUrl
              }
            })
          }}
        />
      )}
    </Head>
  );
} 