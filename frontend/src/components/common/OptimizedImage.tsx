import { memo, useState, useEffect } from 'react';
import { getImageUrl } from '../../utils/imageHelper';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = '',
  imgClassName = ''
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const resolvedSrc = getImageUrl(src);

  useEffect(() => {
    setLoaded(false);
  }, [resolvedSrc]);

  return (
    <div className={`relative ${className}`}>
      {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl" />}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
      />
    </div>
  );
});
