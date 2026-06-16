import { LOGIN_PAGE, TOKEN_KEY } from "./config.js";

export function ensureAuthenticatedOnLoad() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && token.trim()) {
    return;
  }

  console.warn("Token de acesso nao encontrado. Redirecionando para login.");
  localStorage.clear();
  window.location.replace(LOGIN_PAGE);
}

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token && token.trim() ? token : null;
}

export function parseJwtPayload(tokenValue) {
  if (!tokenValue) {
    return null;
  }

  try {
    const payload = tokenValue.split(".")[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
    return JSON.parse(decoded);
  } catch (_error) {
    return null;
  }
}

export function getCurrentUserIdFromToken() {
  const payload = parseJwtPayload(getToken());
  const userId = payload?.sub;
  return userId ? String(userId) : null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function redirectToLoginOnAuthFailure(response) {
  if (response.status === 401 || response.status === 403) {
    localStorage.clear();
    window.location.replace(LOGIN_PAGE);
    return true;
  }

  return false;
}
