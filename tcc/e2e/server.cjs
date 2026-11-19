const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".wav": "audio/wav",
};

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
    const content = await fs.readFile(file);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    }).end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404).end("Not found");
      return;
    }
    console.error(error);
    response.writeHead(500).end("Internal server error");
  }
}).listen(4173, "127.0.0.1");
