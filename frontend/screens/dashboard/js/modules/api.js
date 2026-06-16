import { API_BASE } from "./config.js";
import { getToken, redirectToLoginOnAuthFailure } from "./auth.js";

async function parseApiResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.msg || "Erro na API.");
  }
  return data;
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  if (redirectToLoginOnAuthFailure(response)) {
    throw new Error("Sessao expirada.");
  }

  return parseApiResponse(response);
}

export async function apiGetOrNull(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  if (redirectToLoginOnAuthFailure(response)) {
    throw new Error("Sessao expirada.");
  }

  if (response.status === 404) {
    return null;
  }

  return parseApiResponse(response);
}

export async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (redirectToLoginOnAuthFailure(response)) {
    throw new Error("Sessao expirada.");
  }

  return parseApiResponse(response);
}
