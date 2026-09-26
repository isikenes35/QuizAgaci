export const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || localStorage.getItem('playerToken');
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
};

export const isCreator = (): boolean => {
  return !!localStorage.getItem('token');
};

export const isPlayer = (): boolean => {
  return !!localStorage.getItem('playerToken');
};
