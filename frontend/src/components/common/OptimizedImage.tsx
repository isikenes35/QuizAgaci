import { memo, useState } from 'react';

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

  return (
    <div className={`relative ${className}`}>
      {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl" />}
      <img
        src={src}
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
