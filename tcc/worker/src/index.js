/**
 * Worker de notificações — Rotina TEA.
 *
 * Substitui o GitHub Actions como "disparador" dos lembretes e avisos.
 * Roda no Cloudflare Workers via Cron Trigger (1 em 1 minuto, plano
 * gratuito, sem cartão de crédito) — mais confiável que o cron do GitHub
 * Actions, que compartilha capacidade com milhões de outros workflows e
 * pode atrasar bastante em horários de pico.
 *
 * Não usa firebase-admin (biblioteca Node.js pesada, que depende de
 * gRPC/sockets TCP — não roda no runtime do Cloudflare Workers). Em vez
 * disso, fala diretamente com a Firestore REST API e a FCM HTTP v1 API,
 * autenticando com um token OAuth2 obtido a partir da conta de serviço,
 * usando a Web Crypto API (nativa do Workers) para assinar o JWT — nada
 * de dependências externas, o arquivo todo roda sozinho.
 */

const INTERVALO_REPETICAO_MS = 10 * 60 * 1000;
const FUSO_HORARIO = "America/Sao_Paulo";

const formatadorDataLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_HORARIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

function obterDataHoraLocal(data = new Date()) {
  const partes = Object.fromEntries(
    formatadorDataLocal.formatToParts(data).map(({ type, value }) => [type, value])
  );
  const diasDaSemana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    dia: diasDaSemana[partes.weekday],
    horario: `${partes.hour}:${partes.minute}`,
  };
}

// --------------------------------------------------------------------
// Autenticação: troca a conta de serviço por um token de acesso OAuth2.
// --------------------------------------------------------------------

function base64url(bytesOuTexto) {
  const bytes =
    typeof bytesOuTexto === "string" ? new TextEncoder().encode(bytesOuTexto) : bytesOuTexto;
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importarChavePrivada(pem) {
  const corpo = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bytes = Uint8Array.from(atob(corpo), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Gera um token de acesso OAuth2 de curta duração (1h) a partir da conta
 * de serviço, via fluxo JWT Bearer (RFC 7523) — o mesmo mecanismo que o
 * firebase-admin faz por baixo dos panos, só que aqui feito manualmente
 * com fetch() e Web Crypto, compatível com o runtime do Workers.
 */
async function obterTokenAcesso(contaServico) {
  const agora = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: contaServico.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: agora,
      exp: agora + 3600,
    })
  );

  const chave = await importarChavePrivada(contaServico.private_key);
  const assinatura = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    chave,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const jwt = `${header}.${payload}.${base64url(new Uint8Array(assinatura))}`;

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao obter token OAuth2: ${resposta.status} ${await resposta.text()}`);
  }

  const dados = await resposta.json();
  return dados.access_token;
}

// --------------------------------------------------------------------
// Firestore REST API (leitura/escrita de documentos)
// --------------------------------------------------------------------

function firestoreParaObjeto(campos) {
  const resultado = {};
  for (const [chave, valor] of Object.entries(campos || {})) {
    resultado[chave] = firestoreParaValor(valor);
  }
  return resultado;
}

function firestoreParaValor(valor) {
  if (valor.stringValue !== undefined) return valor.stringValue;
  if (valor.integerValue !== undefined) return parseInt(valor.integerValue, 10);
  if (valor.doubleValue !== undefined) return valor.doubleValue;
  if (valor.booleanValue !== undefined) return valor.booleanValue;
  if (valor.timestampValue !== undefined) return new Date(valor.timestampValue);
  if (valor.arrayValue !== undefined) return (valor.arrayValue.values || []).map(firestoreParaValor);
  if (valor.nullValue !== undefined) return null;
  return null;
}

function valorParaFirestore(valor) {
  if (valor instanceof Date) return { timestampValue: valor.toISOString() };
  if (typeof valor === "string") return { stringValue: valor };
  if (typeof valor === "boolean") return { booleanValue: valor };
  if (typeof valor === "number") return { doubleValue: valor };
  return { nullValue: null };
}

async function listarDocumentos(projectId, token, colecao) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${colecao}`;
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resposta.ok) throw new Error(`Erro ao listar ${colecao}: ${resposta.status}`);
  const dados = await resposta.json();
  return (dados.documents || []).map((doc) => ({
    id: doc.name.split("/").pop(),
    caminho: doc.name,
    ...firestoreParaObjeto(doc.fields),
  }));
}

async function atualizarCampos(token, caminhoDocumento, campos) {
  const nomesCampos = Object.keys(campos);
  const url =
    `https://firestore.googleapis.com/v1/${caminhoDocumento}?` +
    nomesCampos.map((c) => `updateMask.fieldPaths=${encodeURIComponent(c)}`).join("&");

  const fieldsFirestore = {};
  for (const [chave, valor] of Object.entries(campos)) {
    fieldsFirestore[chave] = valorParaFirestore(valor);
  }

  const resposta = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: fieldsFirestore }),
  });
  if (!resposta.ok) {
    console.warn(`Falha ao atualizar ${caminhoDocumento}: ${resposta.status} ${await resposta.text()}`);
  }
}

async function excluirDocumento(token, caminhoDocumento) {
  await fetch(`https://firestore.googleapis.com/v1/${caminhoDocumento}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --------------------------------------------------------------------
// FCM HTTP v1 (envio da notificação push)
// --------------------------------------------------------------------

async function enviarPush(projectId, token, dispositivo, titulo, corpo, tag, tarefaId) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: dispositivo.fcmToken,
        data: {
            titulo,
            corpo,
          tag: tag || "rotina",
          tarefaId: tarefaId ? String(tarefaId) : "",
          url: "https://marimoreiraa.github.io/tcc/painel/",
        },
        webpush: { fcm_options: { link: "https://marimoreiraa.github.io/tcc/painel/" } },
      },
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.text();
    console.warn(`Falha ao enviar push (${dispositivo.id}): ${resposta.status} ${erro}`);
    if (erro.includes("UNREGISTERED") || erro.includes("NOT_FOUND")) {
      await excluirDocumento(token, dispositivo.caminho);
      console.log(`Dispositivo ${dispositivo.id} removido (token inválido/expirado).`);
    }
    return;
  }
  console.log(`Push enviado (${dispositivo.id}): ${titulo}`);
}

// --------------------------------------------------------------------
// Regras de negócio (mesma lógica que já existia no script anterior)
// --------------------------------------------------------------------

function tarefaConcluidaHoje(tarefa) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  if (!dataFinalizacao) return false;
  const data = dataFinalizacao instanceof Date ? dataFinalizacao : new Date(dataFinalizacao);
  return obterDataHoraLocal(data).data === obterDataHoraLocal().data;
}

async function processarLembretesParticipante(projectId, token, dispositivos, tarefasPorUid) {
  const agora = obterDataHoraLocal();
  const diaAtual = agora.dia;
  const horarioAtual = agora.horario;

  for (const dispositivo of dispositivos.filter((d) => d.papel === "participante")) {
    const tarefas = tarefasPorUid[dispositivo.uid] || [];

    const tarefasDoDia = tarefas
      .filter((t) => (t.dias && t.dias.length ? t.dias : [0, 1, 2, 3, 4, 5, 6]).includes(diaAtual))
      .filter((t) => t.horario <= horarioAtual && !tarefaConcluidaHoje(t))
      .sort((a, b) => String(a.horario).localeCompare(String(b.horario)));

    const tarefaAtiva = tarefasDoDia[0];
    if (!tarefaAtiva) continue;

    const ultimoLembreteMs = tarefaAtiva.ultimoLembreteEm ? new Date(tarefaAtiva.ultimoLembreteEm).getTime() : 0;
    if (Date.now() - ultimoLembreteMs < INTERVALO_REPETICAO_MS) continue;

    // Mensagem curta e genérica de propósito: a web push não suporta áudio
    // customizado — o áudio real da tarefa só toca quando o app é aberto
    // (o clique na notificação leva direto pra lá). Ver static/sw.js.
    await enviarPush(
      projectId,
      token,
      dispositivo,
      "Hora da Tarefa!",
      "Verifique se você possui tarefas no aplicativo.",
      `hora-tarefa-${tarefaAtiva.id}`,
      tarefaAtiva.id
    );

    await atualizarCampos(token, tarefaAtiva.caminho, { ultimoLembreteEm: new Date() });
  }
}

async function processarAvisosCuidador(projectId, token, dispositivos, todasTarefas) {
  for (const tarefa of todasTarefas) {
    if (!["concluida", "recusada"].includes(tarefa.status)) continue;
    if (!tarefaConcluidaHoje(tarefa)) continue;

    const statusEmMs = tarefa.statusEm ? new Date(tarefa.statusEm).getTime() : 0;
    const ultimoAvisoMs = tarefa.notificacaoCuidadorEnviadaEm
      ? new Date(tarefa.notificacaoCuidadorEnviadaEm).getTime()
      : 0;
    if (ultimoAvisoMs >= statusEmMs) continue;

    const cuidadores = dispositivos.filter((d) => d.papel === "cuidador" && d.uid === tarefa.uid);
    if (cuidadores.length === 0) continue;

    const acao = tarefa.status === "recusada" ? "recusada" : "concluída";
    await Promise.all(
      cuidadores.map((c) =>
        enviarPush(projectId, token, c, "Atualização de Rotina", `A tarefa "${tarefa.titulo}" foi ${acao}!`, `rotina-${tarefa.id}`, tarefa.id)
      )
    );

    await atualizarCampos(token, tarefa.caminho, { notificacaoCuidadorEnviadaEm: new Date() });
  }
}

// --------------------------------------------------------------------
// Ponto de entrada do Worker
// --------------------------------------------------------------------

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(executar(env));
  },

  // Permite testar manualmente acessando a URL do worker no navegador.
  async fetch(request, env) {
    await executar(env);
    return new Response("Notificações processadas.");
  },
};

async function executar(env) {
  const contaServico = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = contaServico.project_id;
  const token = await obterTokenAcesso(contaServico);

  const [dispositivos, tarefas] = await Promise.all([
    listarDocumentos(projectId, token, "dispositivos"),
    listarDocumentos(projectId, token, "tarefas"),
  ]);

  const tarefasPorUid = {};
  for (const t of tarefas) {
    (tarefasPorUid[t.uid] = tarefasPorUid[t.uid] || []).push(t);
  }

  await processarLembretesParticipante(projectId, token, dispositivos, tarefasPorUid);
  await processarAvisosCuidador(projectId, token, dispositivos, tarefas);
}
