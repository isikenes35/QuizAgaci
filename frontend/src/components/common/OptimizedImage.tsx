import { memo, useState, useEffect, useRef } from 'react';
import { getImageUrl, getRawImageUrl } from '../../utils/imageHelper';

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
  const optimizedSrc = getImageUrl(src);
  const rawSrc = getRawImageUrl(src);

  const [activeSrc, setActiveSrc] = useState(optimizedSrc);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const retryStepRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    retryStepRef.current = 0;
    setFailed(false);
    setActiveSrc(optimizedSrc);
    setLoaded(false);
  }, [optimizedSrc]);

  // Handle already-cached / preloaded images immediately so they never stay stuck at opacity-0
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      setFailed(false);
    }
  }, [activeSrc]);

  // Watchdog timer: if a network request stalls for >6s on live, trigger fallback/retry
  useEffect(() => {
    if (loaded || failed || !activeSrc) return;

    const timer = setTimeout(() => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        setLoaded(true);
        return;
      }
      handleFailure();
    }, 6000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc, loaded, failed]);

  const handleFailure = () => {
    // Step 1: If optimized Cloudinary URL failed or timed out, fall back to raw URL
    if (retryStepRef.current === 0 && rawSrc && activeSrc !== rawSrc) {
      retryStepRef.current = 1;
      setLoaded(false);
      setActiveSrc(rawSrc);
      return;
    }

    // Step 2: Retry once with cache-buster to escape a stalled HTTP connection
    if (retryStepRef.current < 2 && rawSrc) {
      retryStepRef.current = 2;
      setLoaded(false);
      const sep = rawSrc.includes('?') ? '&' : '?';
      setActiveSrc(`${rawSrc}${sep}cb=${Date.now()}`);
      return;
    }

    setFailed(true);
    setLoaded(true);
  };

  const handleManualRetry = () => {
    if (!rawSrc) return;
    retryStepRef.current = 2;
    setFailed(false);
    setLoaded(false);
    const sep = rawSrc.includes('?') ? '&' : '?';
    setActiveSrc(`${rawSrc}${sep}cb=${Date.now()}`);
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl" />
      )}
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-gray-500">
          <span className="text-sm font-semibold">Görsel yüklenemedi</span>
          <button
            type="button"
            onClick={handleManualRetry}
            className="px-3 py-1 bg-primary-500 text-white text-xs font-bold rounded-lg hover:bg-primary-600 transition"
          >
            Tekrar Dene
          </button>
        </div>
      ) : (
        <img
          key={activeSrc}
          ref={imgRef}
          src={activeSrc}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onLoad={() => {
            setFailed(false);
            setLoaded(true);
          }}
          onError={handleFailure}
          className={`transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}
    </div>
  );
});

