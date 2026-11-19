const {
  calcularDiferencaMinutos,
  converterHorarioParaMinutos,
  normalizarModo,
  obterTurno,
} = require("./metricas.js");

describe("Suíte de Testes de Unidade - Métricas e Validação", () => {
  test("CT-UT-01: Deve converter horário válido 08:30 para 510 minutos", () => {
    // Arrange
    const horariosValidos = ["00:00", "08:45", "23:59"];

    // Act
    const resultados = horariosValidos.map(converterHorarioParaMinutos);

    // Assert
    expect(resultados).toEqual([0, 525, 1439]);
  });

  test("CT-UT-02: Deve rejeitar horários fora do intervalo ou malformados", () => {
    // Arrange
    const horariosInvalidos = ["24:00", "12:60", "8:05", "abc", ""];

    // Act
    const resultados = horariosInvalidos.map(converterHorarioParaMinutos);

    // Assert
    expect(resultados).toEqual([null, null, null, null, null]);
  });

  test("CT-UT-03: Deve classificar corretamente o turno de um horário válido", () => {
    // Arrange
    const horario = "12:00";

    // Act
    const resultado = obterTurno(horario, null);

    // Assert
    expect(resultado).toBe("Tarde");
  });

  test("CT-UT-04: Deve normalizar modos conhecidos e representar modo ausente", () => {
    // Arrange
    const modos = [" modo pessoal ", null];

    // Act
    const resultados = modos.map(normalizarModo);

    // Assert
    expect(resultados).toEqual(["Pessoal", "Não especificado"]);
  });

  test("CT-UT-05: Deve calcular diferença válida e ignorar horário ou timestamp inválido", () => {
    // Arrange
    const dataReal = new Date(2026, 10, 18, 9, 0);
    const logValido = { horarioPrevisto: "08:45", timestampReal: dataReal };
    const logHorarioInvalido = { horarioPrevisto: "25:00", timestampReal: dataReal };
    const logTimestampInvalido = { horarioPrevisto: "08:45", timestampReal: "data invalida" };

    // Act
    const diferencaValida = calcularDiferencaMinutos(logValido);
    const diferencaComHorarioInvalido = calcularDiferencaMinutos(logHorarioInvalido);
    const diferencaComTimestampInvalido = calcularDiferencaMinutos(logTimestampInvalido);

    // Assert
    expect(diferencaValida).toBe(15);
    expect(diferencaComHorarioInvalido).toBeNull();
    expect(diferencaComTimestampInvalido).toBeNull();
  });
});
