const {
  base64url,
  firestoreParaObjeto,
  obterDataHoraLocal,
  tarefaConcluidaHoje,
  valorParaFirestore,
} = require("./utils.js");

describe("utilitarios do worker", () => {
  test("formata data, dia da semana e horario no fuso de Sao Paulo", () => {
    // Arrange
    const data = new Date("2026-11-18T12:05:00.000Z");

    // Act
    const resultado = obterDataHoraLocal(data);

    // Assert
    expect(resultado).toEqual({ data: "2026-11-18", dia: 3, horario: "09:05" });
  });

  test("converte campos Firestore de volta para valores JavaScript", () => {
    // Arrange
    const campos = {
      nome: { stringValue: "Rotina" },
      quantidade: { integerValue: "4" },
      ativo: { booleanValue: true },
      realizadoEm: { timestampValue: "2026-11-18T12:00:00.000Z" },
      itens: { arrayValue: { values: [{ stringValue: "agua" }, { nullValue: null }] } },
      vazio: { nullValue: null },
    };

    // Act
    const resultado = firestoreParaObjeto(campos);

    // Assert
    expect(resultado).toEqual({
      nome: "Rotina",
      quantidade: 4,
      ativo: true,
      realizadoEm: new Date("2026-11-18T12:00:00.000Z"),
      itens: ["agua", null],
      vazio: null,
    });
  });

  test("converte valores JavaScript para os tipos Firestore suportados", () => {
    // Arrange
    const valores = ["texto", true, 3.5, new Date("2026-11-18T12:00:00.000Z"), undefined];

    // Act
    const resultados = valores.map(valorParaFirestore);

    // Assert
    expect(resultados).toEqual([
      { stringValue: "texto" },
      { booleanValue: true },
      { doubleValue: 3.5 },
      { timestampValue: "2026-11-18T12:00:00.000Z" },
      { nullValue: null },
    ]);
  });

  test("codifica texto em base64url sem padding", () => {
    // Arrange
    const texto = "Olá";

    // Act
    const resultado = base64url(texto);

    // Assert
    expect(resultado).toBe("T2zDoQ");
    expect(resultado).not.toMatch(/[+/=]/);
  });

  test("compara conclusao pela data local e rejeita finalizacoes em outro dia", () => {
    // Arrange
    const agora = new Date("2026-11-18T12:00:00.000Z");
    const tarefaHoje = { statusEm: new Date("2026-11-18T13:00:00.000Z") };
    const tarefaOntem = { concluidaEm: new Date("2026-11-17T13:00:00.000Z") };

    // Act
    const resultadoHoje = tarefaConcluidaHoje(tarefaHoje, agora);
    const resultadoOntem = tarefaConcluidaHoje(tarefaOntem, agora);

    // Assert
    expect(resultadoHoje).toBe(true);
    expect(resultadoOntem).toBe(false);
  });
});
