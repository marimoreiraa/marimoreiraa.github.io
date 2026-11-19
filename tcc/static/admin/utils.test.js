const { ehArquivoHeic, nomeArquivoJpeg, tarefaFinalizadaHoje } = require("./utils.js");

describe("utilitarios do admin", () => {
  test("identifica arquivos HEIC/HEIF por extensao ou MIME type", () => {
    // Arrange
    const arquivos = [
      { name: "foto.HEIC", type: "image/heic" },
      { name: "foto-sem-extensao", type: "image/heif" },
      { name: "foto.jpg", type: "image/jpeg" },
    ];

    // Act
    const resultados = arquivos.map(ehArquivoHeic);

    // Assert
    expect(resultados).toEqual([true, true, false]);
  });

  test("converte a extensao HEIC/HEIF para JPG sem alterar o restante do nome", () => {
    // Arrange
    const nomes = ["Foto.HEIC", "imagem.heif", "foto.jpeg"];

    // Act
    const resultados = nomes.map(nomeArquivoJpeg);

    // Assert
    expect(resultados).toEqual(["Foto.jpg", "imagem.jpg", "foto.jpeg"]);
  });

  test("identifica finalizacao de tarefa no mesmo dia local", () => {
    // Arrange
    const hoje = new Date(2026, 10, 18, 12);
    const tarefaFinalizada = { statusEm: new Date(2026, 10, 18, 8).toISOString() };
    const tarefaNaoFinalizada = { concluidaEm: new Date(2026, 10, 17, 23).toISOString() };

    // Act
    const finalizadaHoje = tarefaFinalizadaHoje(tarefaFinalizada, hoje);
    const finalizadaEmOutroDia = tarefaFinalizadaHoje(tarefaNaoFinalizada, hoje);
    const semData = tarefaFinalizadaHoje({}, hoje);

    // Assert
    expect(finalizadaHoje).toBe(true);
    expect(finalizadaEmOutroDia).toBe(false);
    expect(semData).toBeUndefined();
  });
});
