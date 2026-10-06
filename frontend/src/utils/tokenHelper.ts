export const getAuthToken = (): string | null => {
  return sessionStorage.getItem('playerToken') || localStorage.getItem('playerToken') || localStorage.getItem('token');
};

export const getPlayerParticipantId = (): string | null => {
  const token = sessionStorage.getItem('playerToken') || localStorage.getItem('playerToken');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub || null;
  } catch {
    return null;
  }
};

export const setCreatorToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const setPlayerToken = (token: string): void => {
  localStorage.setItem('playerToken', token);
};

export const clearTokens = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('playerToken');
  sessionStorage.removeItem('playerToken');
};

export const isCreator = (): boolean => {
  return !!localStorage.getItem('token');
};

export const isPlayer = (): boolean => {
  return !!sessionStorage.getItem('playerToken') || !!localStorage.getItem('playerToken');
};
