const { selecionarTarefaAtiva, tarefaConcluidaHoje } = require("./utils.js");

describe("utilitarios do painel", () => {
  test("seleciona a tarefa vencida mais cedo entre dias ativos", () => {
    // Arrange
    const tarefas = [
      { id: "mais-tarde", horario: "10:00", dias: [2] },
      { id: "mais-cedo", horario: "08:00", dias: [2] },
      { id: "outro-dia", horario: "07:00", dias: [3] },
      { id: "futura", horario: "12:00", dias: [2] },
    ];

    // Act
    const resultado = selecionarTarefaAtiva(tarefas, 2, "11:00");

    // Assert
    expect(resultado.id).toBe("mais-cedo");
  });

  test("nao seleciona tarefa finalizada hoje nem tarefa fora do dia configurado", () => {
    // Arrange
    const diaAtual = new Date().getDay();
    const outroDia = (diaAtual + 1) % 7;
    const tarefas = [
      { id: "finalizada", horario: "08:00", dias: [diaAtual], statusEm: new Date().toISOString() },
      { id: "outro-dia", horario: "07:00", dias: [outroDia] },
    ];

    // Act
    const resultado = selecionarTarefaAtiva(tarefas, diaAtual, "23:59");

    // Assert
    expect(resultado).toBeUndefined();
  });

  test("reconhece a data de finalizacao de hoje e datas anteriores", () => {
    // Arrange
    const hoje = new Date(2026, 10, 18, 12);
    const hojeISO = new Date(2026, 10, 18, 8).toISOString();
    const ontemISO = new Date(2026, 10, 17, 23).toISOString();

    // Act
    const resultadoHoje = tarefaConcluidaHoje({ statusEm: hojeISO }, hoje);
    const resultadoOntem = tarefaConcluidaHoje({ concluidaEm: ontemISO }, hoje);

    // Assert
    expect(resultadoHoje).toBe(true);
    expect(resultadoOntem).toBe(false);
  });
});
