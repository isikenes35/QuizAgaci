export interface SavedPlayerSession {
  token: string;
  sessionToken?: string;
  gameCode: string;
  nickname: string;
  savedAt: number;
}

export const getAuthToken = (): string | null => {
  const isPlayerRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/game/');
  if (isPlayerRoute) {
    return sessionStorage.getItem('playerToken') || localStorage.getItem('playerToken') || localStorage.getItem('token');
  }
  return localStorage.getItem('token') || sessionStorage.getItem('playerToken') || localStorage.getItem('playerToken');
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

export const setPlayerToken = (token: string, sessionToken?: string, gameCode?: string, nickname?: string): void => {
  localStorage.setItem('playerToken', token);
  sessionStorage.setItem('playerToken', token);
  if (sessionToken) {
    localStorage.setItem('playerSessionToken', sessionToken);
    sessionStorage.setItem('playerSessionToken', sessionToken);
  }
  if (gameCode) {
    const codeKey = gameCode.trim().toUpperCase();
    const sessionData: SavedPlayerSession = {
      token,
      sessionToken,
      gameCode: codeKey,
      nickname: nickname || '',
      savedAt: Date.now()
    };
    localStorage.setItem(`quiz_session_${codeKey}`, JSON.stringify(sessionData));
  }
};

export const getSavedPlayerSession = (gameCode: string): SavedPlayerSession | null => {
  if (!gameCode) return null;
  const codeKey = gameCode.trim().toUpperCase();
  const raw = localStorage.getItem(`quiz_session_${codeKey}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // 24 saat geçerlilik sınırı
    if (parsed.savedAt && Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`quiz_session_${codeKey}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const getPlayerSessionToken = (gameCode?: string): string | null => {
  if (gameCode) {
    const saved = getSavedPlayerSession(gameCode);
    if (saved?.sessionToken) return saved.sessionToken;
  }
  return sessionStorage.getItem('playerSessionToken') || localStorage.getItem('playerSessionToken');
};

export const clearTokens = (gameCode?: string): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('playerToken');
  sessionStorage.removeItem('playerToken');
  localStorage.removeItem('playerSessionToken');
  sessionStorage.removeItem('playerSessionToken');
  if (gameCode) {
    localStorage.removeItem(`quiz_session_${gameCode.trim().toUpperCase()}`);
  }
};

export const isCreator = (): boolean => {
  return !!localStorage.getItem('token');
};

export const isPlayer = (): boolean => {
  return !!sessionStorage.getItem('playerToken') || !!localStorage.getItem('playerToken');
};
