function criarIdDocumentoDispositivo(uid, papel) {
  return `${uid}_${papel}`;
}

const pushUtils = { criarIdDocumentoDispositivo };

if (typeof module !== "undefined" && module.exports) {
  module.exports = pushUtils;
} else {
  globalThis.PushUtils = pushUtils;
}
