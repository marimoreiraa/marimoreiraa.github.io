const modo = localStorage.getItem("modoApp") || "enhanced";

let audioAtual = null;
let temaAtual  = null;
let perfil     = null;

/* ================= PERFIL ================= */
function loadPerfil() {
  try {
    return JSON.parse(localStorage.getItem('perfilAprendizado')) || {};
  } catch(e) {
    return {};
  }
}

/* ================= ÁUDIO ================= */
function setWaves(on) {
  document.getElementById('audioWaves').classList.toggle('active', on);
  document.getElementById('characterWrapper').classList.toggle('speaking', on);
}

function tocarAudio(src, onEnd) {
  if (audioAtual) {
    audioAtual.pause();
    audioAtual.currentTime = 0;
  }

  setWaves(true);

  const a = new Audio(src);
  a.volume = Math.max(0, Math.min(1, (perfil.volume ?? 50) / 100));
  audioAtual = a;

  const done = () => {
    setWaves(false);
    if (onEnd) onEnd();
  };

  a.addEventListener('ended', done);
  a.addEventListener('error', done);

  a.play().catch(done);
}

/* ================= PERSONAGEM ================= */
function renderPersonagem(tema) {
  const w = document.getElementById('characterWrapper');
  w.innerHTML = '';

  const img = document.createElement('img');
  img.src = tema.imagem;
  img.alt = tema.label;
  img.className = 'character-img';

  img.onerror = () => {
    w.innerHTML = `<span class="character-emoji">${tema.emoji}</span>`;
  };

  w.appendChild(img);

  w.onclick = () => tocarAudio(tema.audio);
}

/* ================= UI ================= */
function mostrarIniciar() {
  const block = document.getElementById('startBlock');
  block.classList.remove('ds-hidden');

  block.style.animation = 'none';
  block.offsetHeight;
  block.style.animation = 'ds-popIn 0.45s cubic-bezier(0.34,1.56,0.64,1)';
}

/* ================= APLICA PERFIL ================= */
function aplicarPerfil() {
  perfil = loadPerfil();

  temaAtual = window.TEMAS[perfil.tema] ?? window.TEMAS['dora'];

  const page = document.getElementById('welcomePage');
  const btn  = document.getElementById('btnStart');

  // fundo
  page.style.backgroundColor = perfil.cor || temaAtual.bgColor;

  // fonte
  document.body.classList.add(
    window.FONTE_CLASSE[perfil.fonte] || 'font-medium'
  );

  if (modo === "enhanced") {
    btn.style.backgroundColor = temaAtual.accentColor;

    renderPersonagem(temaAtual);

    tocarAudio(temaAtual.audio, mostrarIniciar);
  }

  if (modo === "simple") {
    document.getElementById('characterWrapper').style.display = 'none';
    document.getElementById('audioWaves').style.display = 'none';

    btn.style.backgroundColor = '#4CAF50';

    tocarAudio('public/audios/bemvindo_simples.mp3', mostrarIniciar);
  }
}

/* ================= START ================= */
function iniciar() {
  if (audioAtual) {
    audioAtual.pause();
    audioAtual.currentTime = 0;
  }

  window.location.href = 'learn.html';
}

document.addEventListener('DOMContentLoaded', aplicarPerfil);