const API_BASE = "http://127.0.0.1:5000";
const TOKEN_KEY = "pw_access_token";
const DASHBOARD_PAGE = "../dashboard/index.html";

const refs = {
  form: document.getElementById("login-form"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  error: document.getElementById("login-error")
};

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.msg || "Falha no login.");
  }

  return data.access_token;
}

refs.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  refs.error.textContent = "";

  const email = refs.email.value.trim();
  const password = refs.password.value;

  if (!email || !password) {
    refs.error.textContent = "Preencha e-mail e senha.";
    return;
  }

  try {
    const token = await login(email, password);
    if (token && token.trim()) {
      setToken(token);
      window.location.replace(DASHBOARD_PAGE);
    } else {
      refs.error.textContent = "Token inválido.";
    }
  } catch (error) {
    refs.error.textContent = error.message;
  }
});
