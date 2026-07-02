const modo = localStorage.getItem("modoApp") || "enhanced";

let perfil = null;
let tema = null;
let accent = '#e05fa0';
let vogalIdx = 0;
let audioAtual = null;

/* ================= ÁUDIO ================= */
function tocarAudio(src, onEnd) {
  if (!src) return;

  if (audioAtual) {
    audioAtual.pause();
    audioAtual.currentTime = 0;
  }

  const a = new Audio(src);
  audioAtual = a;

  a.addEventListener('ended', () => onEnd && onEnd());
  a.play().catch(() => onEnd && onEnd());
}

/* ================= UI ================= */
function setBubble(text) {
  document.getElementById('bubbleText').textContent = text;
}

function showContinue(v) {
  const b = document.getElementById('btnContinue');
  v ? b.classList.remove('ds-hidden') : b.classList.add('ds-hidden');
}

/* ================= PERSONAGEM ================= */
function renderPersonagem() {
  const w = document.getElementById('charWrapper');
  w.innerHTML = '';

  const img = document.createElement('img');
  img.src = tema.imagem;
  img.className = 'char-img';

  img.onerror = () => {
    w.innerHTML = `<span class="char-emoji">${tema.emoji}</span>`;
  };

  w.appendChild(img);

  w.onclick = () => {
    const v = VOGAIS_LEARN[vogalIdx];
    tocarAudio(v.audioIntro);
  };
}

/* ================= CARD EXPLORAR ================= */
function criarCardExplorar(item) {
  const card = document.createElement('div');
  card.className = 'explorar-card';

  const img = document.createElement('img');
  img.src = item.img;

  img.onerror = () => {
    img.remove();
    card.textContent = item.emoji || '❓';
    card.style.fontSize = '3rem';
  };

  card.appendChild(img);

  // 👉 ao clicar → escuta o som (SEM texto)
  card.onclick = () => {
    tocarAudio(item.audio);
  };

  return card;
}

/* ================= RENDER ================= */
function renderLearn() {
  const v = VOGAIS_LEARN[vogalIdx];

  setBubble(`Vamos aprender a letra ${v.letra}`);

  const stage = document.getElementById('stage');
  stage.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'layout-vowel-learn';

  // 🔤 LETRA
  const letraCard = document.createElement('div');
  letraCard.className = 'act-card act-card-vowel';

  const letra = document.createElement('span');
  letra.className = 'big-letter';
  letra.textContent = v.letra;

  letraCard.appendChild(letra);

  letraCard.onclick = () => tocarAudio(v.audioLetra);

  layout.appendChild(letraCard);

  // 🧠 EXPLORAR
  const grid = document.createElement('div');
  grid.className = 'explorar-grid';

  v.explorar.forEach(item => {
    grid.appendChild(criarCardExplorar(item));
  });

  layout.appendChild(grid);

  stage.appendChild(layout);

  if (modo === "simple") {

    setBubble(`Vamos aprender a letra ${v.letra}`);

    tocarAudio(v.audioIntro, () => {
      showContinue(true);
    });

  } else {

    // 🎧 áudio inicial
    tocarAudio(v.audioIntro, () => {


      tocarAudio(v.audioRepete, () => {

        setBubble('Repete comigo');

        tocarAudio(v.audioLetra, () => {

          setBubble('Agora explore as imagens');

          showContinue(true);

        });

      });

    });
  }
}

/* ================= BOTÕES ================= */
function avancar() {
  window.location.href = `activity.html?vogal=${vogalIdx}`;
}

function repetirInstrucao() {
  const v = VOGAIS_LEARN[vogalIdx];
  tocarAudio(v.audioIntro);
}

/* ================= INIT ================= */
function init() {
  perfil = JSON.parse(localStorage.getItem('perfilAprendizado')) || {};

  tema = window.TEMAS[perfil.tema] ?? window.TEMAS['dora'];
  accent = tema.accentColor;

  document.documentElement.style.setProperty('--accent', accent);
  document.querySelectorAll('.ds-btn').forEach(b => {
    b.style.backgroundColor = accent;
  });

  document.getElementById('actPage').style.backgroundColor =
    perfil.cor || tema.bgColor;

  document.body.classList.add(FONTE_CLASSE[perfil.fonte] || 'font-medium');

  const params = new URLSearchParams(window.location.search);
  vogalIdx = parseInt(params.get('vogal') || '0');

  if (modo === "simple") {
    document.body.classList.add("simple-mode");

    const char = document.getElementById('charWrapper');
    if (char) char.style.display = 'none';
  }

  
  renderPersonagem();
  renderLearn();
}

document.addEventListener('DOMContentLoaded', init);