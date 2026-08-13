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

function mostrarTela(tela, nome) {
  [telaInicio, telaLivre, telaTarefa].forEach((t) => t.classList.remove("ativa"));
  tela.classList.add("ativa");
  telaAtual = nome;
}

function iniciar() {
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
  fotoTarefa.src = tarefa.imagemBase64 || "";
  mostrarTela(telaTarefa, "tarefa");
  btnConcluir.disabled = false;
  tocarAudioInstrucao(tarefa.audioBase64);
}

async function concluirTarefa() {
  if (!tarefaAtualId) return;

  btnConcluir.disabled = true;
  const idConcluido = tarefaAtualId;

  try {
    await updateDoc(doc(db, "tarefas", idConcluido), { concluidaEm: new Date().toISOString() });

    audioSucesso.currentTime = 0;
    audioSucesso.play().catch(() => {});

    tarefaAtualId = null;
    ultimoAudioTocadoEm = 0;
    mostrarTela(telaLivre, "livre");
  } catch (erro) {
    console.error("Erro ao concluir tarefa:", erro);
    btnConcluir.disabled = false;
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
  return tarefa.concluidaEm && new Date(tarefa.concluidaEm).toDateString() === new Date().toDateString();
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
