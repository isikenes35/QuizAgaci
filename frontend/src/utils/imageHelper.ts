export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5294/api';
  const host = baseUrl.replace('/api', '');
  return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
};
