const { criarIdDocumentoDispositivo } = require("./push-utils.js");

describe("utilitarios de registro push", () => {
  test("gera um id de documento para participante", () => {
    // Arrange
    const uid = "usuario-123";
    const papel = "participante";

    // Act
    const resultado = criarIdDocumentoDispositivo(uid, papel);

    // Assert
    expect(resultado).toBe("usuario-123_participante");
  });

  test("gera um id de documento para cuidador", () => {
    // Arrange
    const uid = "usuario-123";
    const papel = "cuidador";

    // Act
    const resultado = criarIdDocumentoDispositivo(uid, papel);

    // Assert
    expect(resultado).toBe("usuario-123_cuidador");
  });
});
