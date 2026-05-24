import { useState, useCallback } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  placeholderClassName?: string;
}

/**
 * Performance-optimized image with:
 * - Native lazy loading + async decoding
 * - Fade-in on load (no layout shift — container must have explicit size)
 * - Automatic error fallback
 */
export default function LazyImage({
  src,
  alt,
  fallback = 'https://picsum.photos/seed/fallback/400/400',
  className = '',
  placeholderClassName = '',
  ...rest
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setErrored(true);
    setLoaded(true);
  }, []);

  return (
    <>
      {/* Low-contrast placeholder shown until image loads */}
      {!loaded && (
        <div
          className={`absolute inset-0 skeleton ${placeholderClassName}`}
          aria-hidden="true"
        />
      )}
      <img
        src={errored ? fallback : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        {...rest}
      />
    </>
  );
}
