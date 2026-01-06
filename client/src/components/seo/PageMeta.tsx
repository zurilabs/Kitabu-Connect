import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface PageMetaProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export function PageMeta({
  title,
  description,
  keywords,
  ogImage,
  canonicalUrl,
  noIndex = false,
}: PageMetaProps) {
  const [location] = useLocation();
  const baseUrl = 'https://kitabu.com';
  const fullTitle = `${title} | Kitabu Connect`;
  const defaultImage = `${baseUrl}/og-image.png`;
  const canonical = canonicalUrl || `${baseUrl}${location}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Update meta tags
    const metaTags = [
      { name: 'description', content: description },
      { name: 'title', content: fullTitle },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: ogImage || defaultImage },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage || defaultImage },
      { name: 'twitter:url', content: canonical },
    ];

    if (keywords) {
      metaTags.push({ name: 'keywords', content: keywords });
    }

    if (noIndex) {
      metaTags.push({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      metaTags.push({ name: 'robots', content: 'index, follow' });
    }

    // Update existing meta tags or create new ones
    metaTags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      let element = document.querySelector(selector);

      if (!element) {
        element = document.createElement('meta');
        if (name) {
          element.setAttribute('name', name);
        } else if (property) {
          element.setAttribute('property', property);
        }
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    });

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);

    return () => {
      // Cleanup is handled by the next PageMeta component
    };
  }, [title, description, keywords, ogImage, canonical, noIndex, fullTitle, defaultImage]);

  return null;
}
