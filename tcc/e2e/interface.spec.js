const { test, expect } = require("@playwright/test");
const path = require("node:path");

test.beforeEach(async ({ page }) => {
  // Isola servicos externos; os modulos e os manipuladores da interface sao reais.
  await page.route("https://www.gstatic.com/firebasejs/**", (route) =>
    route.fulfill({
      path: path.join(__dirname, "fixtures/firebase.js"),
      contentType: "text/javascript",
    })
  );
  await page.route("https://cdn.jsdelivr.net/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" })
  );
  await page.goto("/tcc/admin/");
  await expect(page.getByText("Nenhuma tarefa cadastrada ainda.")).toBeVisible();
});

async function preencherTarefa(page, titulo) {
  await page.getByLabel("Título interno").fill(titulo);
  await page.getByLabel("Horário", { exact: true }).fill("09:30");
  await page.getByLabel("Instrução escrita").fill("Beba um copo de água");
  await page.locator("#input-foto-galeria").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5N0AAAAASUVORK5CYII=",
      "base64"
    ),
  });
  const wav = Buffer.alloc(46);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(38, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(2, 40);
  await page.locator("#input-audio-arquivo").setInputFiles({
    name: "instrucao.wav",
    mimeType: "audio/wav",
    buffer: wav,
  });
}

test("CT-01 (Carregamento): mostra titulo e acoes principais", async ({ page }) => {
  await expect(page).toHaveTitle("Painel do Cuidador");
  await expect(page.getByRole("heading", { name: /Rotina do Dia/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar tarefa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Abrir painel da jovem/ })).toBeVisible();
});

test("CT-02 (Fluxo Principal Valido): cadastra tarefa com foto e audio", async ({ page }) => {
  // Arrange
  await preencherTarefa(page, "Beber água");
  // Act
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  // Assert
  await expect(page.getByText("Tarefa salva com sucesso!")).toBeVisible();
  const tarefa = page.locator(".item-tarefa").filter({ hasText: "Beber água" });
  await expect(tarefa).toHaveCount(1);
  await expect(tarefa).toContainText("09:30");
  await expect(tarefa).toContainText("Pendente");
});

test("CT-03 (Entrada Invalida): informa erro quando nenhum dia e selecionado", async ({ page }) => {
  // Arrange
  await preencherTarefa(page, "Tarefa inválida");
  for (const dia of await page.getByRole("checkbox").all()) await dia.uncheck();
  // Act
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  // Assert
  await expect(page.getByText("Selecione pelo menos um dia.", { exact: true })).toBeVisible();
  await expect(page.locator(".item-tarefa")).toHaveCount(0);
});

test("CT-04 (Persistencia): mantem tarefa cadastrada apos recarregar", async ({ page }) => {
  // Arrange
  await preencherTarefa(page, "Tarefa persistente");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.getByText("Tarefa salva com sucesso!")).toBeVisible();
  // Act
  await page.reload();
  // Assert
  const tarefa = page.locator(".item-tarefa").filter({ hasText: "Tarefa persistente" });
  await expect(tarefa).toHaveCount(1);
  await expect(tarefa).toContainText("09:30");
  await expect(tarefa).toContainText("Pendente");
  await expect(tarefa.locator("img")).toBeVisible();
});
