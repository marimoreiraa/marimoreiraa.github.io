/* =========================================
   DADOS DE REFERÊNCIA
   ========================================= */
const TEMAS = {
  dora:        { label: 'Dora Aventureira', imagem: './public/imagens/dora.png' }, 
  mickey:      { label: 'Mickey',           imagem: './public/imagens/mickey.png' },
  princesas:   { label: 'Princesas',        imagem: './public/imagens/princesas.png' },
  dinossauros: { label: 'Dinossauros',      imagem: './public/imagens/dino.png' },
  sitio:       { label: 'Sítio do Pica-Pau',imagem: './public/imagens/emilia.png' },
  customizar:  { label: 'Customizar',       imagem: './public/imagens/custom.png' },
};

/*  CORES PASTEL  */
const CORES = {
  neutro:        { label: 'Neutro suave',   value: '#F8FAFC' },
  offwhite:      { label: 'Branco',         value: '#FFFFFF' },
  cinzaClaro:    { label: 'Cinza claro',    value: '#EEF2F7' },

  rosaSuave:     { label: 'Rosa suave',     value: '#FCE7F3' },
  azulSuave:     { label: 'Azul suave',     value: '#E0F2FE' },
  verdeSuave:    { label: 'Verde suave',    value: '#E8F5E9' },
  amareloSuave:  { label: 'Amarelo suave',  value: '#FEF9C3' },
  lilasSuave:    { label: 'Lilás suave',    value: '#F3E8FF' },
};

const FONTE_LABELS = {
  'text-base': 'Pequeno',
  'text-xl': 'Médio',
  'text-2xl': 'Grande'
};

/* =========================================
   ESTADO
   ========================================= */
const state = {
  tema:   'dora',
  cor:    'neutro', // ✔ fundo seguro por padrão
  fonte:  'text-xl',
  volume: 50,
  som:    true,
};

/* =========================================
   HANDLERS
   ========================================= */
function selectTema(btn) {
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.tema = btn.dataset.tema;
  updatePreview();
}

function selectCor(btn) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.cor = btn.dataset.cor;
  updatePreview();
}

function selectFonte(btn) {
  document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.fonte = btn.dataset.size;
  updatePreview();
}

/* =========================================
   SOM
   ========================================= */
function toggleSom() {
  state.som = document.getElementById('somToggle').checked;
  const volumeRange = document.getElementById('volumeRange');
  const volIcon = document.getElementById('vol-icon');

  volumeRange.disabled = !state.som;
  volIcon.textContent = state.som ? '🔊' : '🔇';

  updatePreview();
}

function updateVolume() {
  state.volume = Number(document.getElementById('volumeRange').value);
  document.getElementById('volLabel').textContent = state.volume + '%';
  updatePreview();
}

/* =========================================
   PREVIEW
   ========================================= */
function updatePreview() {
  const nomeInput = document.getElementById('nome');
  const previewCard  = document.getElementById('previewCard');
  const previewEmoji = document.getElementById('previewEmoji');
  const previewNome  = document.getElementById('previewNome');

  const infoTema  = document.getElementById('infoTema');
  const infoCor   = document.getElementById('infoCor');
  const infoFonte = document.getElementById('infoFonte');
  const infoSom   = document.getElementById('infoSom');

  const nome = nomeInput.value.trim() || 'Nome do Usuário';
  const tema = TEMAS[state.tema];
  const cor  = CORES[state.cor];

  previewCard.style.backgroundColor = cor.value;

  previewEmoji.innerHTML = `
    <img src="${tema.imagem}" 
         alt="${tema.label}" 
         style="width: 12rem; height: 12rem; object-fit: contain;" />
  `;

  previewNome.textContent = nome;
  previewNome.className   = 'preview-name ' + state.fonte;

  infoTema.textContent  = tema.label;
  infoCor.textContent   = cor.label;
  infoFonte.textContent = FONTE_LABELS[state.fonte];
  infoSom.textContent   = state.som ? state.volume + '%' : 'Desativado';
}

/* =========================================
   SALVAR
   ========================================= */
function salvar() {
  const nome  = document.getElementById('nome').value.trim();
  const idade = document.getElementById('idade').value;

  if (!nome) {
    alert('Preencha o nome.');
    return;
  }

  const perfil = {
    nome,
    idade,
    tema:   state.tema,
    cor:    CORES[state.cor].value,
    fonte:  state.fonte,
    volume: state.volume,
    som:    state.som,
  };

  localStorage.setItem('perfilAprendizado', JSON.stringify(perfil));
  window.location.href = 'menu.html';
}

document.addEventListener('DOMContentLoaded', updatePreview);