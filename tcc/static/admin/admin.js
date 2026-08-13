import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const auth = window.auth;
const db = window.db;

const form = document.getElementById("form-tarefa");
const msgForm = document.getElementById("msg-form");
const listaTarefas = document.getElementById("lista-tarefas");

const inputFotoCamera = document.getElementById("input-foto-camera");
const inputFotoGaleria = document.getElementById("input-foto-galeria");
const btnTirarFoto = document.getElementById("btn-tirar-foto");
const btnEscolherFoto = document.getElementById("btn-escolher-foto");
const previewFoto = document.getElementById("preview-foto");

const inputAudioArquivo = document.getElementById("input-audio-arquivo");
const btnGravarAudio = document.getElementById("btn-gravar-audio");
const btnEscolherAudio = document.getElementById("btn-escolher-audio");
const previewAudio = document.getElementById("preview-audio");
const avisoGravacao = document.getElementById("aviso-gravacao");
const btnSair = document.getElementById("btn-sair");

let cancelarListenerTarefas = null;

onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.replace("../login/");
    return;
  }

  const tarefasDaCuidadora = query(
    collection(db, "tarefas"),
    where("uid", "==", usuario.uid),
  );

  cancelarListenerTarefas?.();
  cancelarListenerTarefas = onSnapshot(tarefasDaCuidadora, (snapshot) => {
    const tarefas = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    tarefas.sort((a, b) => a.horario.localeCompare(b.horario));
    renderizarTarefas(tarefas);
  }, () => {
    listaTarefas.innerHTML = "<p class='carregando'>Não foi possível carregar as tarefas.</p>";
  });
});

btnSair.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("../login/");
  } catch (erro) {
    console.error("Erro ao sair:", erro);
    msgForm.textContent = "Não foi possível sair. Tente novamente.";
    msgForm.className = "mensagem erro";
  }
});

// Arquivos efetivamente selecionados (por câmera, galeria, gravação ou upload),
// mantidos fora do <form> porque nem toda mídia vem de um <input type="file">.
let fotoSelecionada = null;
let audioSelecionado = null;

// --------------------------------------------------------------------
// Foto: tirar agora (câmera) ou escolher da galeria
// --------------------------------------------------------------------

btnTirarFoto.addEventListener("click", () => inputFotoCamera.click());
btnEscolherFoto.addEventListener("click", () => inputFotoGaleria.click());

inputFotoCamera.addEventListener("change", () => definirFoto(inputFotoCamera.files[0]));
inputFotoGaleria.addEventListener("change", () => definirFoto(inputFotoGaleria.files[0]));

function definirFoto(arquivo) {
  if (!arquivo) return;
  fotoSelecionada = arquivo;
  const url = URL.createObjectURL(arquivo);
  previewFoto.innerHTML = `<img src="${url}" alt="Prévia da foto">`;
}

// --------------------------------------------------------------------
// Áudio: gravar agora (microfone) ou escolher arquivo já existente
// --------------------------------------------------------------------

btnEscolherAudio.addEventListener("click", () => inputAudioArquivo.click());
inputAudioArquivo.addEventListener("change", () => definirAudio(inputAudioArquivo.files[0]));

function definirAudio(arquivo) {
  if (!arquivo) return;
  audioSelecionado = arquivo;
  const url = URL.createObjectURL(arquivo);
  previewAudio.innerHTML = `<audio controls src="${url}"></audio>`;
}

let mediaRecorder = null;
let pedacosGravacao = [];
let gravando = false;

btnGravarAudio.addEventListener("click", async () => {
  if (gravando) {
    pararGravacao();
    return;
  }

  // Gravar áudio exige HTTPS (ou localhost) por política de segurança do
  // navegador — se o app estiver em HTTP simples (ex.: acessado por IP
  // local sem certificado), o navegador bloqueia o microfone. Nesse caso,
  // orientamos a usar "Escolher arquivo" com o gravador nativo do celular.
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    avisoGravacao.textContent =
      "Gravação direta não disponível neste endereço (precisa de HTTPS). Use \"Escolher arquivo\" e grave pelo app de gravador de voz do celular.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pedacosGravacao = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) pedacosGravacao.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(pedacosGravacao, { type: "audio/webm" });
      const arquivo = new File([blob], `gravacao_${Date.now()}.webm`, { type: "audio/webm" });
      definirAudio(arquivo);
      avisoGravacao.textContent = "";
    };

    mediaRecorder.start();
    gravando = true;
    btnGravarAudio.textContent = "⏹️ Parar gravação";
    btnGravarAudio.classList.add("gravando");
    avisoGravacao.textContent = "Gravando...";
  } catch (erro) {
    console.error("Erro ao acessar microfone:", erro);
    avisoGravacao.textContent =
      "Não foi possível acessar o microfone (verifique a permissão do navegador, ou use \"Escolher arquivo\").";
  }
});

function pararGravacao() {
  if (mediaRecorder && gravando) {
    mediaRecorder.stop();
  }
  gravando = false;
  btnGravarAudio.textContent = "🎙️ Gravar áudio agora";
  btnGravarAudio.classList.remove("gravando");
}

// --------------------------------------------------------------------
// Conversão de HEIC/HEIF (fotos de iPhone) para JPEG, no navegador
// --------------------------------------------------------------------

async function converterSeNecessario(arquivo) {
  const isHeic =
    /\.(heic|heif)$/i.test(arquivo.name) ||
    arquivo.type === "image/heic" ||
    arquivo.type === "image/heif";

  if (!isHeic) return arquivo;

  const blobConvertido = await heic2any({
    blob: arquivo,
    toType: "image/jpeg",
    quality: 0.85,
  });

  const novoNome = arquivo.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([blobConvertido], novoNome, { type: "image/jpeg" });
}

// --------------------------------------------------------------------
// Envio do formulário
// --------------------------------------------------------------------

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!fotoSelecionada) {
    msgForm.textContent = "Tire ou escolha uma foto antes de salvar.";
    msgForm.className = "mensagem erro";
    return;
  }
  if (!audioSelecionado) {
    msgForm.textContent = "Grave ou escolha um áudio antes de salvar.";
    msgForm.className = "mensagem erro";
    return;
  }

  msgForm.textContent = "Preparando foto...";
  msgForm.className = "mensagem";

  let fotoFinal = fotoSelecionada;
  try {
    fotoFinal = await converterSeNecessario(fotoSelecionada);
  } catch (erro) {
    console.error("Erro ao converter HEIC:", erro);
    msgForm.textContent =
      "Não foi possível converter essa foto automaticamente. Tente novamente com internet ativa, ou envie uma foto em JPEG.";
    msgForm.className = "mensagem erro";
    return;
  }

  msgForm.textContent = "Salvando...";

  try {
    const [imagemBase64, audioBase64] = await Promise.all([
      comprimirImagem(fotoFinal),
      arquivoParaBase64(audioSelecionado),
    ]);
    const dias = [...form.querySelectorAll('input[name="dias"]:checked')].map((input) => Number(input.value));
    if (dias.length === 0) throw new Error("Selecione pelo menos um dia.");

    await addDoc(collection(db, "tarefas"), {
      titulo: form.querySelector('[name="titulo"]').value.trim(),
      horario: form.querySelector('[name="horario"]').value,
      dias,
      uid: auth.currentUser.uid,
      imagemBase64,
      audioBase64,
      concluidaEm: null,
      criadoEm: new Date().toISOString(),
    });
    msgForm.textContent = "Tarefa salva com sucesso!";
    msgForm.className = "mensagem sucesso";
    form.reset();
    form.querySelectorAll('input[name="dias"]').forEach((input) => { input.checked = true; });
    fotoSelecionada = null;
    audioSelecionado = null;
    previewFoto.innerHTML = "";
    previewAudio.innerHTML = "";
    avisoGravacao.textContent = "";
  } catch (erro) {
    console.error(erro);
    msgForm.textContent = erro.message || "Erro ao salvar tarefa.";
    msgForm.className = "mensagem erro";
  }
});

function comprimirImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => {
      const escala = Math.min(1, 600 / Math.max(imagem.width, imagem.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(imagem.src);
    };
    imagem.onerror = reject;
    imagem.src = URL.createObjectURL(arquivo);
  });
}

function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

function renderizarTarefas(tarefas) {
  if (tarefas.length === 0) {
    listaTarefas.innerHTML = "<p class='carregando'>Nenhuma tarefa cadastrada ainda.</p>";
    return;
  }

  listaTarefas.innerHTML = tarefas
    .map((t) => {
      const statusClasse = tarefaConcluidaHoje(t) ? "concluida" : "pendente";
      const statusTexto = tarefaConcluidaHoje(t) ? "Concluída" : "Pendente";

      return `
        <div class="item-tarefa">
          <img class="miniatura" src="${t.imagemBase64 || ""}" alt="">
          <div class="info">
            <div class="titulo">${escapeHtml(t.titulo)}</div>
            <div class="horario">${t.horario}</div>
          </div>
          <span class="status-pill ${statusClasse}">${statusTexto}</span>
          <button class="btn-excluir" title="Excluir" data-id="${t.id}">🗑️</button>
        </div>
      `;
    })
    .join("");
}

function tarefaConcluidaHoje(tarefa) {
  return tarefa.concluidaEm && new Date(tarefa.concluidaEm).toDateString() === new Date().toDateString();
}

async function excluirTarefa(id) {
  if (!confirm("Excluir esta tarefa da rotina?")) return;
  try {
    await deleteDoc(doc(db, "tarefas", id));
  } catch (erro) {
    alert("Erro ao excluir tarefa.");
  }
}

function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

listaTarefas.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".btn-excluir");
  if (botao) excluirTarefa(botao.dataset.id);
});

