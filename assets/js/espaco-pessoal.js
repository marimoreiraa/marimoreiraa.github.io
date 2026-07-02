(function () {
  const AUTH_KEY = "personalSpaceAuth";
  const USER = "admin";
  const PASS = "1234";

  const authWrap = document.getElementById("personal-auth-wrap");
  const dashboard = document.getElementById("personal-dashboard");

  if (!authWrap || !dashboard) return;

  const form = document.getElementById("personal-login-form");
  const message = document.getElementById("personal-login-message");
  const logoutButton = document.getElementById("personal-logout");

  function showDashboard() {
    authWrap.classList.add("hidden");
    dashboard.classList.remove("hidden");
  }

  function showAuth() {
    authWrap.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }

  function isAuthenticated() {
    return localStorage.getItem(AUTH_KEY) === "true";
  }

  function handleLogin(event) {
    event.preventDefault();

    const user = document.getElementById("personal-user").value.trim();
    const pass = document.getElementById("personal-pass").value.trim();

    if (user === USER && pass === PASS) {
      localStorage.setItem(AUTH_KEY, "true");
      message.textContent = "";
      form.reset();
      showDashboard();
      return;
    }

    message.textContent = "Credenciais invalidas.";
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY);
    showAuth();
  }

  form.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", handleLogout);

  if (isAuthenticated()) {
    showDashboard();
  } else {
    showAuth();
  }
})();
