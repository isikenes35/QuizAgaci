export const getRawImageUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5294/api';
  const host = baseUrl.replace('/api', '');
  return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const getImageUrl = (path: string | undefined | null): string => {
  const rawUrl = getRawImageUrl(path);
  if (!rawUrl) return '';

  // Optimize Cloudinary URLs automatically (WebP/AVIF, auto quality, max 1280px)
  // to prevent multi-megabyte raw images from stalling the connection after 10-15 questions.
  if (
    rawUrl.includes('res.cloudinary.com') &&
    rawUrl.includes('/image/upload/') &&
    !rawUrl.includes('/image/upload/f_') &&
    !rawUrl.includes('/image/upload/q_') &&
    !rawUrl.includes('/image/upload/w_')
  ) {
    return rawUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_1280,c_limit/');
  }

  return rawUrl;
};

