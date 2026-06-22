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

export async function apiPostRaw(path, rawBody, contentType) {
  const headers = {
    Authorization: `Bearer ${getToken()}`
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: rawBody
  });

  if (redirectToLoginOnAuthFailure(response)) {
    throw new Error("Sessao expirada.");
  }

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_error) {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(parsed?.msg || text || "Erro ao enviar arquivo para ingestao.");
  }

  return parsed ?? { raw: text };
}

function parseContentDispositionFileName(headerValue) {
  if (!headerValue) {
    return null;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = headerValue.match(/filename="?([^";]+)"?/i);
  if (basicMatch && basicMatch[1]) {
    return basicMatch[1];
  }

  return null;
}

export async function apiDownload(path, defaultFileName = "download.bin") {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  if (redirectToLoginOnAuthFailure(response)) {
    throw new Error("Sessao expirada.");
  }

  if (!response.ok) {
    let message = "Erro ao baixar arquivo.";
    try {
      const data = await response.json();
      if (data?.msg) {
        message = data.msg;
      }
    } catch (_error) {
      // Ignore JSON parse failure on non-JSON error body.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition");
  const fileName = parseContentDispositionFileName(contentDisposition) || defaultFileName;

  return { blob, fileName };
}
