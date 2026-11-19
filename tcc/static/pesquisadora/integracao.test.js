/**
 * Abordagem Bottom-Up: testa primeiro as funções utilitárias de metricas.js
 * integradas aos manipuladores de interface e estado de pesquisadora.js.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const metricas = require("./metricas.js");

const codigoPesquisadora = fs
  .readFileSync(path.join(__dirname, "pesquisadora.js"), "utf8")
  .replace(/^import .*;$/gm, "");

function criarElemento(tagName = "element") {
  let html = "";
  let texto = "";
  const listeners = {};

  const elemento = {
    tagName: tagName.toUpperCase(),
    value: "",
    href: "",
    download: "",
    clicked: false,
    addEventListener(tipo, callback) {
      listeners[tipo] = callback;
    },
    disparar(tipo, evento = {}) {
      listeners[tipo]?.({ target: elemento, ...evento });
    },
    click() {
      elemento.clicked = true;
    },
  };

  Object.defineProperties(elemento, {
    textContent: {
      get: () => texto,
      set: (valor) => {
        texto = String(valor);
      },
    },
    innerHTML: {
      get: () => tagName === "div"
        ? texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        : html,
      set: (valor) => {
        html = String(valor);
      },
    },
  });

  return elemento;
}

function criarPagina(logs) {
  const elementos = new Map();
  const downloads = [];
  let callbackAutenticacao;
  let blobCriado;

  const document = {
    getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, criarElemento());
      return elementos.get(id);
    },
    createElement(tagName) {
      const elemento = criarElemento(tagName);
      if (tagName === "a") downloads.push(elemento);
      return elemento;
    },
  };

  class BlobFake {
    constructor(partes, opcoes) {
      this.partes = partes;
      this.type = opcoes.type;
      blobCriado = this;
    }
  }

  const contexto = {
    window: {
      auth: {},
      db: {},
      location: { replace: jest.fn() },
    },
    document,
    globalThis: null,
    Metricas: metricas,
    Blob: BlobFake,
    URL: {
      createObjectURL: jest.fn(() => "blob:teste"),
      revokeObjectURL: jest.fn(),
    },
    Chart: jest.fn(() => ({ destroy: jest.fn() })),
    console: { error: jest.fn() },
    onAuthStateChanged: jest.fn((auth, callback) => {
      callbackAutenticacao = callback;
    }),
    signOut: jest.fn(),
    collection: jest.fn((db, nome) => ({ db, nome })),
    getDocs: jest.fn(async () => ({
      docs: logs.map((log, index) => ({
        id: `log-${index + 1}`,
        data: () => log,
      })),
    })),
    EMAIL_PESQUISADORA: "0076895@academico.ifmg.edu.br",
    jest,
  };
  contexto.globalThis = contexto;
  contexto.window.document = document;

  vm.runInNewContext(codigoPesquisadora, contexto, {
    filename: "pesquisadora.js",
  });

  return {
    elementos,
    downloads,
    blobCriado: () => blobCriado,
    autenticar: async () => {
      callbackAutenticacao({ email: contexto.EMAIL_PESQUISADORA });
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

function timestampLocal(hora, minuto) {
  return { seconds: new Date(2026, 10, 18, hora, minuto).getTime() / 1000 };
}

describe("integracao das metricas com a pesquisadora", () => {
  test("carrega logs do Firestore e atualiza metricas e tabela no DOM", async () => {
    // Arrange
    const pagina = criarPagina([
      {
        emailParticipante: "pessoa@example.com",
        nomeTarefa: "Tomar água",
        modoUso: "Fixo",
        horarioPrevisto: "08:45",
        timestampReal: timestampLocal(9, 0),
        acao: "Concluida",
        usoAudio: true,
      },
      {
        emailParticipante: "outra@example.com",
        nomeTarefa: "Pausa",
        modoUso: "Pessoal",
        horarioPrevisto: "12:00",
        timestampReal: timestampLocal(12, 0),
        acao: "Recusada",
        usoAudio: false,
      },
    ]);

    // Act
    await pagina.autenticar();

    // Assert
    expect(pagina.elementos.get("metric-total").textContent).toBe("2");
    expect(pagina.elementos.get("metric-conclusao").textContent).toBe("50.0%");
    expect(pagina.elementos.get("metric-recusa").textContent).toBe("50.0%");
    expect(pagina.elementos.get("historico-logs-body").innerHTML).toContain("pessoa@example.com");
    expect(pagina.elementos.get("historico-logs-body").innerHTML).toContain("Manhã");
    expect(pagina.elementos.get("tabela-gargalos-body").innerHTML).toContain("15 min");
  });

  test("filtra participante pelo seletor e recalcula as metricas exibidas", async () => {
    // Arrange
    const pagina = criarPagina([
      {
        emailParticipante: "ana@example.com",
        nomeTarefa: "Leitura",
        modoUso: "Pessoal",
        horarioPrevisto: "09:00",
        timestampReal: timestampLocal(9, 5),
        acao: "Concluida",
      },
      {
        emailParticipante: "bia@example.com",
        nomeTarefa: "Alongamento",
        modoUso: "Fixo",
        horarioPrevisto: "15:00",
        timestampReal: timestampLocal(15, 20),
        acao: "Omitida",
      },
    ]);
    await pagina.autenticar();
    const seletor = pagina.elementos.get("filtro-participante");

    // Act
    seletor.disparar("change", { target: { value: "bia@example.com" } });

    // Assert
    expect(pagina.elementos.get("metric-total").textContent).toBe("1");
    expect(pagina.elementos.get("metric-omissao").textContent).toBe("100.0%");
    expect(pagina.elementos.get("historico-logs-body").innerHTML).toContain("bia@example.com");
    expect(pagina.elementos.get("historico-logs-body").innerHTML).not.toContain("ana@example.com");
  });

  test("exporta CSV usando as metricas e os dados renderizados da interface", async () => {
    // Arrange
    const pagina = criarPagina([
      {
        emailParticipante: "pessoa@example.com",
        nomeTarefa: "Hidratação",
        modoUso: "Pessoal",
        horarioPrevisto: "08:45",
        timestampReal: timestampLocal(9, 0),
        acao: "Concluida",
        usoAudio: true,
      },
    ]);
    await pagina.autenticar();

    // Act
    pagina.elementos.get("btn-exportar-csv").disparar("click");

    // Assert
    const linkDownload = pagina.downloads[0];
    const csv = pagina.blobCriado().partes[0];
    expect(linkDownload.clicked).toBe(true);
    expect(linkDownload.download).toBe("logs-pesquisa-tea-ihc.csv");
    expect(csv).toContain('"pessoa@example.com"');
    expect(csv).toContain('"Manhã"');
    expect(csv).toContain('"15"');
  });
});
