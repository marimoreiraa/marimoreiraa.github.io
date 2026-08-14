/* ============================================================
   Lógica do painel do usuário final.

   Fluxo:
   1. Tela inicial exige 1 toque (desbloqueia autoplay de áudio
      nas políticas do Android/Chrome).
  2. Escuta o Firestore em tempo real e verifica se há alguma
    tarefa "ativa" (horário já chegado e ainda não concluída).
   3. Se houver, mostra a foto + toca o áudio automaticamente
      e exibe o botão verde de confirmação.
   4. Se a tarefa não for concluída, o áudio é repetido a cada
      10 minutos como reforço do lembrete.
  5. Ao confirmar, toca o som de sucesso e atualiza o Firestore.
      volta para a tela "tudo pronto".
   ============================================================ */

const telaInicio = document.getElementById("tela-inicio");
const telaLivre = document.getElementById("tela-livre");
const telaTarefa = document.getElementById("tela-tarefa");
const fotoTarefa = document.getElementById("foto-tarefa");
const audioTarefa = document.getElementById("audio-tarefa");
const audioSucesso = document.getElementById("audio-sucesso");
const btnConcluir = document.getElementById("btn-concluir");
const btnRecusar = document.getElementById("btn-recusar");
const tituloTarefa = document.getElementById("titulo-tarefa");
const textoInstrucao = document.getElementById("texto-instrucao");
const btnConfiguracoes = document.getElementById("btn-configuracoes");
const configuracoes = document.getElementById("configuracoes");
const seletorModo = document.getElementById("modo-exibicao");
const mostrarTextoFixo = document.getElementById("mostrar-texto-fixo");

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { collection, onSnapshot, updateDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const auth = window.auth;
const db = window.db;

const INTERVALO_REPETICAO_MS = 10 * 60 * 1000;

let telaAtual = "inicio";
let tarefaAtualId = null;
let tarefas = [];
let ultimoAudioTocadoEm = 0;
let cancelarListenerTarefas = null;
let tarefaAtual = null;
let modoExibicao = localStorage.getItem("modoExibicao") || "fixo";
let exibirTextoNoFixo = localStorage.getItem("mostrarTextoFixo") === "true";

async function solicitarPermissaoNotificacoes() {
  if (!("Notification" in window) || Notification.permission !== "default") return;

  try {
    await Notification.requestPermission();
  } catch (erro) {
    console.warn("Não foi possível solicitar permissão para notificações:", erro);
  }
}

function aplicarModoExibicao() {
  document.body.dataset.modo = modoExibicao;
  seletorModo.value = modoExibicao;
  mostrarTextoFixo.checked = exibirTextoNoFixo;
  mostrarTextoFixo.disabled = modoExibicao !== "fixo";

  if (tarefaAtual) preencherConteudoTarefa(tarefaAtual);
}

function preencherConteudoTarefa(tarefa) {
  tituloTarefa.textContent = tarefa.titulo || "Tarefa";
  textoInstrucao.textContent = tarefa.textoInstrucao || "";
  const deveExibirTexto = Boolean(tarefa.textoInstrucao) && (modoExibicao === "pessoal" || exibirTextoNoFixo);
  textoInstrucao.hidden = !deveExibirTexto;
  tituloTarefa.hidden = modoExibicao !== "pessoal";
}

function chaveNotificacao(tarefa) {
  return `notificacao:${new Date().toISOString().slice(0, 10)}:${tarefa.id}`;
}

async function notificarHoraDaTarefa(tarefa) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!document.hidden && modoExibicao !== "pessoal") return;

  const chave = chaveNotificacao(tarefa);
  if (localStorage.getItem(chave)) return;

  const opcoes = {
    body: tarefa.textoInstrucao || tarefa.titulo,
    icon: "../icone.png",
    tag: `hora-tarefa-${tarefa.id}`,
  };

  try {
    new Notification("Hora da Tarefa!", opcoes);
  } catch (erro) {
    const registro = await navigator.serviceWorker?.ready;
    await registro?.showNotification("Hora da Tarefa!", opcoes);
  }
  localStorage.setItem(chave, "true");
}

btnConfiguracoes.addEventListener("click", () => {
  configuracoes.hidden = !configuracoes.hidden;
});

seletorModo.addEventListener("change", () => {
  modoExibicao = seletorModo.value;
  localStorage.setItem("modoExibicao", modoExibicao);
  aplicarModoExibicao();
  solicitarPermissaoNotificacoes();
});

mostrarTextoFixo.addEventListener("change", () => {
  exibirTextoNoFixo = mostrarTextoFixo.checked;
  localStorage.setItem("mostrarTextoFixo", String(exibirTextoNoFixo));
  aplicarModoExibicao();
});

aplicarModoExibicao();

function mostrarTela(tela, nome) {
  [telaInicio, telaLivre, telaTarefa].forEach((t) => t.classList.remove("ativa"));
  tela.classList.add("ativa");
  telaAtual = nome;
}

function iniciar() {
  solicitarPermissaoNotificacoes();
  // Um toque real do usuário "libera" o áudio para tocar sozinho depois.
  audioTarefa.play().catch(() => {});
  audioTarefa.pause();
  audioSucesso.play().catch(() => {});
  audioSucesso.pause();

  mostrarTela(telaLivre, "livre");
  atualizarTarefaAtiva();
}

function atualizarTarefaAtiva() {
  const agora = new Date();
  const diaAtual = agora.getDay();
  const horarioAtual = agora.toTimeString().slice(0, 5);
  const tarefa = tarefas
    .filter((item) => (item.dias || [0, 1, 2, 3, 4, 5, 6]).includes(diaAtual))
    .filter((item) => item.horario <= horarioAtual && !tarefaConcluidaHoje(item))
    .sort((a, b) => a.horario.localeCompare(b.horario))[0];

  if (tarefa) {
    if (tarefa.id !== tarefaAtualId) {
      tarefaAtualId = tarefa.id;
      exibirTarefa(tarefa);
    } else if (Date.now() - ultimoAudioTocadoEm >= INTERVALO_REPETICAO_MS) {
      tocarAudioInstrucao(tarefa.audioBase64);
    }
  } else {
    tarefaAtualId = null;
    tarefaAtual = null;
    if (telaAtual !== "livre") mostrarTela(telaLivre, "livre");
  }
}

function tocarAudioInstrucao(audioBase64) {
  if (!audioBase64) return;
  audioTarefa.src = audioBase64;
  audioTarefa.currentTime = 0;
  audioTarefa.play().catch(() => {
    // Se o autoplay for bloqueado pelo navegador, a jovem ainda pode
    // tocar na foto para ouvir a instrução (ver listener abaixo).
  });
  ultimoAudioTocadoEm = Date.now();
}

function exibirTarefa(tarefa) {
  tarefaAtual = tarefa;
  fotoTarefa.src = tarefa.imagemBase64 || "";
  preencherConteudoTarefa(tarefa);
  btnRecusar.hidden = tarefa.opcional !== true;
  mostrarTela(telaTarefa, "tarefa");
  btnConcluir.disabled = false;
  btnRecusar.disabled = false;
  tocarAudioInstrucao(tarefa.audioBase64);
  notificarHoraDaTarefa(tarefa);
}

async function concluirTarefa() {
  const concluida = await finalizarTarefa("concluida");
  if (concluida) {

    audioSucesso.currentTime = 0;
    audioSucesso.play().catch(() => {});
  }
}

async function recusarTarefa() {
  if (!tarefaAtual?.opcional) return;
  await finalizarTarefa("recusada");
}

async function finalizarTarefa(status) {
  if (!tarefaAtualId) return false;

  btnConcluir.disabled = true;
  btnRecusar.disabled = true;
  const idFinalizado = tarefaAtualId;
  const finalizadaEm = new Date().toISOString();

  try {
    await updateDoc(doc(db, "tarefas", idFinalizado), {
      status,
      statusEm: finalizadaEm,
      concluidaEm: status === "concluida" ? finalizadaEm : null,
    });

    tarefaAtualId = null;
    tarefaAtual = null;
    ultimoAudioTocadoEm = 0;
    mostrarTela(telaLivre, "livre");
    return true;
  } catch (erro) {
    console.error(`Erro ao marcar tarefa como ${status}:`, erro);
    btnConcluir.disabled = false;
    btnRecusar.disabled = false;
    return false;
  }
}

// Tocar na foto reproduz a instrução novamente (reforço, sem depender
// de o autoplay ter funcionado).
fotoTarefa.addEventListener("click", () => {
  if (audioTarefa.src) {
    audioTarefa.currentTime = 0;
    audioTarefa.play().catch(() => {});
  }
});

function tarefaConcluidaHoje(tarefa) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  return dataFinalizacao && new Date(dataFinalizacao).toDateString() === new Date().toDateString();
}

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
    tarefas = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    if (telaAtual !== "inicio") atualizarTarefaAtiva();
  }, (erro) => console.error("Erro ao escutar tarefas:", erro));
});

setInterval(atualizarTarefaAtiva, 5000);
window.iniciar = iniciar;
window.concluirTarefa = concluirTarefa;
window.recusarTarefa = recusarTarefa;
