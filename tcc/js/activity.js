/* =====================================================
   CONFIGURAÇÃO INICIAL
===================================================== */
const modo = localStorage.getItem("modoApp") || "enhanced";

let perfil = {};
let tema = {};
let accent = '#e05fa0';

let audioAtual = null;

let vogalIdx = 0;
let rodada = 0;
let acertouNaPrimeira = true;


/* =====================================================
   ÁUDIO
===================================================== */
function tocarAudio(src, onEnd) {
  if (!src) {
    onEnd && onEnd();
    return;
  }

  if (audioAtual) {
    audioAtual.pause();
    audioAtual.currentTime = 0;
  }

  const audio = new Audio(src);

  audio.volume = Math.max(0, Math.min(1, (perfil.volume ?? 50) / 100));

  audio.onerror = () => {
    console.warn("Erro ao carregar áudio:", src);
    onEnd && onEnd();
  };

  audio.onended = () => onEnd && onEnd();

  audioAtual = audio;
  
  // Tenta reproduzir, com tratamento para autoplay bloqueado no mobile
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      console.log("Autoplay bloqueado no mobile.");
      // Timeout curto antes de chamar callback (experiência melhor no mobile)
      setTimeout(() => onEnd && onEnd(), 300);
    });
  }

  // Timeout de segurança: se o áudio não terminar em 30s, assume que algo deu errado
  setTimeout(() => {
    if (audio.currentTime === 0 && audio.paused) {
      onEnd && onEnd();
    }
  }, 30000);
}


/* =====================================================
   SEQUÊNCIA DE ÁUDIOS
===================================================== */
function tocarSequenciaAudios(lista, onEnd) {
  let i = 0;

  function next() {
    if (i >= lista.length) {
      onEnd && onEnd();
      return;
    }

    tocarAudio(lista[i], () => {
      i++;
      next();
    });
  }

  next();
}


/* =====================================================
   UI
===================================================== */
function setBubble(texto) {
  document.getElementById('bubbleText').textContent = texto;
}

function atualizarFundo() {
  const bg = perfil.cor || tema.bgColor || '#F8FAFC';
  document.getElementById('actPage').style.backgroundColor = bg;
}

function atualizarBotoes() {
  document.querySelectorAll('.ds-btn').forEach(btn => {
    btn.style.setProperty('background-color', accent, 'important');
  });
}


/* =====================================================
   PROGRESSO
===================================================== */
function atualizarProgresso() {
  const total = 5;
  const progresso = Math.min(rodada / total, 1);

  const fill = document.getElementById('progressFill');
  const char = document.getElementById('progressChar');

  if (fill) fill.style.width = (progresso * 100) + '%';
  if (char) char.style.left = (progresso * 100) + '%';
}


/* =====================================================
   PERSONAGEM
===================================================== */
function renderPersonagem() {
  const wrapper = document.getElementById('charWrapper');

  if (modo === "simple") {
    wrapper.style.display = 'none';
    return;
  }

  wrapper.innerHTML = '';

  const img = document.createElement('img');
  img.src = tema.imagem;
  img.className = 'char-img';

  img.onerror = () => {
    wrapper.innerHTML = `<span class="char-emoji">${tema.emoji}</span>`;
  };

  wrapper.appendChild(img);
  wrapper.onclick = repetirInstrucao;
}


/* =====================================================
   CARDS
===================================================== */
function criarCardLetra(letra, audio) {
  const card = document.createElement('div');
  card.className = 'act-card act-card-letter';

  const texto = document.createElement('span');
  texto.className = 'big-letter';
  texto.textContent = letra;
  texto.style.color = accent;

  card.appendChild(texto);
  card.onclick = () => tocarAudio(audio);

  return card;
}

function criarCardImagem(item, correta, onClick) {
  const card = document.createElement('div');
  card.className = 'act-card act-card-image';

  const img = document.createElement('img');
  img.src = item.img;
  img.className = 'card-pic';

  img.onerror = () => {
    img.remove();
    const emoji = document.createElement('span');
    emoji.className = 'card-emoji-fb';
    emoji.textContent = item.emoji || '❓';
    card.appendChild(emoji);
  };

  card.appendChild(img);

  card.onclick = () => onClick(card, item, correta);

  return card;
}


/* =====================================================
   CONTROLE DE INTERAÇÃO
===================================================== */
function bloquearCards() {
  document.querySelectorAll('.act-card').forEach(c => {
    c.style.pointerEvents = 'none';
  });
}

function desbloquearCards() {
  document.querySelectorAll('.act-card').forEach(c => {
    c.style.pointerEvents = 'auto';
  });
}


/* =====================================================
   RODADAS
===================================================== */
const RODADAS = [
  { corretas: 1, erradas: 1 },
  { corretas: 2, erradas: 1 },
  { corretas: 3, erradas: 1 },
  { corretas: 2, erradas: 2 },
  { corretas: 3, erradas: 2 },
];


/* =====================================================
   ATIVIDADE
===================================================== */
function renderAtividade() {
  const v = VOGAIS_ACT[vogalIdx];

  acertouNaPrimeira = true;
  setBubble(v.instrucaoAt);

  if (modo === "enhanced") {
    tocarAudio(v.audioAtivIntro);
  }

  const config = RODADAS[Math.min(rodada, RODADAS.length - 1)];

  const corretas = shuffle([...v.corretas]).slice(0, config.corretas);
  const erradas  = shuffle([...v.erradas]).slice(0, config.erradas);

  const opcoes = shuffle([...corretas, ...erradas]);

  let acertos = 0;

  const stage = document.getElementById('stage');
  stage.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'layout-act';

  layout.appendChild(criarCardLetra(v.letra, v.audioLetra));

  opcoes.forEach(item => {
    const correta = v.corretas.some(c => c.nome === item.nome);

    const card = criarCardImagem(item, correta, (el, it, isCorrect) => {

      bloquearCards();

      if (isCorrect) {

        tocarAudio(it.audio, () => {
          tratarAcerto(el);
          desbloquearCards();
        });

      } else {

        tocarSequenciaAudios([
          it.audio,
          v.audioErroBase,
          v.audioLetra
        ], () => {
          desbloquearCards();
        });

        tratarErro(el);
      }
    });

    layout.appendChild(card);
  });

  stage.appendChild(layout);


  function tratarAcerto(el) {
    el.classList.add('correct');
    el.style.pointerEvents = 'none';

    acertos++;

    if (acertos === corretas.length) {
      finalizarRodada();
    }
  }

  function tratarErro(el) {
    acertouNaPrimeira = false;

    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 500);
  }

  function finalizarRodada() {
    rodada++;

    atualizarProgresso();

    bloquearCards();

    setTimeout(() => {
      if (rodada >= 5) {
        mostrarFeedback(() => avancarParaProximaVogal());
      } else {
        mostrarFeedback(() => renderAtividade());
      }
    }, 600);
  }
}


/* =====================================================
   FEEDBACK
===================================================== */
function mostrarFeedback(callback) {
  const v = VOGAIS_ACT[vogalIdx];
  const overlay = document.getElementById('feedbackOverlay');

  document.getElementById('feedbackGif').src = tema.gifParabens;
  document.getElementById('feedbackMsg').innerHTML = "Muito bem! 🎉";

  overlay.classList.add('active');

  if (modo === "enhanced") {
    tocarAudio(v.audioParabens);
  }

  overlay._next = callback;
}

function feedbackContinuar() {
  const overlay = document.getElementById('feedbackOverlay');
  overlay.classList.remove('active');

  if (overlay._next) overlay._next();
}


/* =====================================================
   NAVEGAÇÃO
===================================================== */
function repetirInstrucao() {
  const v = VOGAIS_ACT[vogalIdx];
  tocarAudio(v.audioAtivIntro);
}

function avancarParaProximaVogal() {
  vogalIdx++;

  if (vogalIdx < VOGAIS_ACT.length) {
    window.location.href = `learn.html?vogal=${vogalIdx}`;
  } else {
    alert("Parabéns! Você terminou! 🎉");
  }
}


/* =====================================================
   UTIL
===================================================== */
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}


/* =====================================================
   INIT
===================================================== */
function init() {
  perfil = JSON.parse(localStorage.getItem('perfilAprendizado')) || {};

  tema = window.TEMAS[perfil.tema] ?? window.TEMAS['dora'];
  accent = tema.accentColor;

  document.documentElement.style.setProperty('--accent', accent);

  atualizarFundo();
  atualizarBotoes();

  document.body.classList.add(
    FONTE_CLASSE?.[perfil.fonte] || 'font-medium'
  );

  // personagem na barra de progresso
  const img = document.getElementById('progressImg');

  if (modo === "simple") {
    // remove personagem da barra
    if (img) img.style.display = 'none';

  } else {
    if (img) img.src = tema.imagem;
  }

  // modo simples
  if (modo === "simple") {
    document.body.classList.add("simple-mode");

    const char = document.getElementById('charWrapper');
    if (char) char.style.display = 'none';
  }

  renderPersonagem();

  const params = new URLSearchParams(window.location.search);
  vogalIdx = parseInt(params.get('vogal') || '0');

  atualizarProgresso();
  renderAtividade();
}

document.addEventListener('DOMContentLoaded', init);