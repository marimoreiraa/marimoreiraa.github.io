const { tarefaConcluidaHoje } = require("./notification-utils.js");

describe("utilitario de finalizacao de notificacoes", () => {
  test("reconhece conclusao de hoje usando data ISO ou Timestamp do Firestore", () => {
    // Arrange
    const hoje = new Date(2026, 10, 18, 12);
    const emISO = { statusEm: new Date(2026, 10, 18, 8).toISOString() };
    const timestampFirestore = {
      concluidaEm: { toDate: () => new Date(2026, 10, 18, 9) },
    };

    // Act
    const resultadoISO = tarefaConcluidaHoje(emISO, hoje);
    const resultadoFirestore = tarefaConcluidaHoje(timestampFirestore, hoje);

    // Assert
    expect(resultadoISO).toBe(true);
    expect(resultadoFirestore).toBe(true);
  });

  test("retorna falso para tarefa sem data ou finalizada em outro dia", () => {
    // Arrange
    const hoje = new Date(2026, 10, 18, 12);
    const tarefaSemData = {};
    const tarefaAntiga = { statusEm: new Date(2026, 10, 17, 23).toISOString() };

    // Act
    const resultadoSemData = tarefaConcluidaHoje(tarefaSemData, hoje);
    const resultadoAntigo = tarefaConcluidaHoje(tarefaAntiga, hoje);

    // Assert
    expect(resultadoSemData).toBe(false);
    expect(resultadoAntigo).toBe(false);
  });
});
