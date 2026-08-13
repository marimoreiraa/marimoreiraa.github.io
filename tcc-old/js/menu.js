let perfil = null;
let tema = null;
let accent = '#e05fa0';

function initMenu() {
  try {
    perfil = JSON.parse(localStorage.getItem("perfilAprendizado")) || {};
  } catch {
    perfil = {};
  }

  // Tema
  tema = window.TEMAS?.[perfil.tema] ?? window.TEMAS['dora'];
  accent = tema.accentColor;

  // ===== FUNDO =====
  const page = document.getElementById("menuPage");
  page.style.backgroundColor = perfil.cor || tema.bgColor;

  // ===== FONTE =====
  document.body.classList.add(
    window.FONTE_CLASSE?.[perfil.fonte] || 'font-medium'
  );

  // ===== ACCENT GLOBAL =====
  document.documentElement.style.setProperty('--accent', accent);

  // ===== BOTÕES =====
  document.querySelectorAll('.menu-card').forEach(card => {
    
    // borda no hover
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = accent;
    });

    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'transparent';
    });

    // foco acessível
    card.addEventListener('focus', () => {
      card.style.borderColor = accent;
    });

    card.addEventListener('blur', () => {
      card.style.borderColor = 'transparent';
    });
  });

  // ===== TÍTULO COM ACCENT =====
  const title = document.getElementById('menuTitle');
  if (title) {
    title.style.color = accent;
  }
}

// =========================================
// SELEÇÃO DE MODO
// =========================================
function selecionarModo(modo) {
  localStorage.setItem("modoApp", modo);
  window.location.href = "welcome.html";
}

document.addEventListener("DOMContentLoaded", initMenu);