(function () {
  const LIMITE_INTERVALO_MS = 2000;
  const TEMPO_DICA_MS = 5000;

  function criarAdaptadorAtividade() {
    const estadoUsuario = {
      tempoEntreCliques: [],
      indicesClicados: [],
      acertosConsecutivos: 0,
      errosConsecutivos: 0,
      padroesMecanicosDetectados: 0,
      acertosSemPadraoMecanico: 0,
      ultimoCliqueTs: null,
    };

    let modoReducaoAtivo = false;
    let rodadaPadraoMecanicoDetectado = false;
    let timerDica = null;
    let cardsAtuais = [];
    let cardCorretoAtual = null;

    function limparTimerDica() {
      if (!timerDica) return;
      clearTimeout(timerDica);
      timerDica = null;
    }

    function removerDestaqueDica() {
      cardsAtuais.forEach((card) => card.classList.remove("dica-highlight"));
    }

    function aplicarVisibilidadeOpcoes() {
      const limite = modoReducaoAtivo ? 2 : 3;

      cardsAtuais.forEach((card, idx) => {
        if (idx < limite) {
          card.classList.remove("hidden");
        } else {
          card.classList.add("hidden");
        }
      });
    }

    function detectarPadraoMecanico() {
      const { indicesClicados, tempoEntreCliques } = estadoUsuario;
      if (indicesClicados.length < 3 || tempoEntreCliques.length < 2) return false;

      const ultimosIndices = indicesClicados.slice(-3);
      const ultimosIntervalos = tempoEntreCliques.slice(-2);

      const ordemDom = ultimosIndices[0] === 0 && ultimosIndices[1] === 1 && ultimosIndices[2] === 2;
      const ritmoImpulsivo = ultimosIntervalos.every((tempo) => tempo < LIMITE_INTERVALO_MS);

      return ordemDom && ritmoImpulsivo;
    }

    function agendarDicaPorInatividade() {
      limparTimerDica();

      if (estadoUsuario.errosConsecutivos < 2 || !cardCorretoAtual) return;

      timerDica = setTimeout(() => {
        if (estadoUsuario.errosConsecutivos >= 2) {
          cardCorretoAtual.classList.add("dica-highlight");
        }
      }, TEMPO_DICA_MS);
    }

    function registrarClique(event) {
      const card = event.currentTarget;
      const indice = Number(card.dataset.optionIndex);
      const correta = card.dataset.correct === "true";
      const agora = Date.now();

      if (estadoUsuario.ultimoCliqueTs !== null) {
        estadoUsuario.tempoEntreCliques.push(agora - estadoUsuario.ultimoCliqueTs);
      }

      estadoUsuario.ultimoCliqueTs = agora;
      estadoUsuario.indicesClicados.push(indice);

      removerDestaqueDica();
      limparTimerDica();

      const padraoMecanicoDetectadoAgora = detectarPadraoMecanico();

      if (padraoMecanicoDetectadoAgora) {
        rodadaPadraoMecanicoDetectado = true;
        estadoUsuario.padroesMecanicosDetectados += 1;
        estadoUsuario.acertosSemPadraoMecanico = 0;

        if (estadoUsuario.padroesMecanicosDetectados >= 2) {
          modoReducaoAtivo = true;
          aplicarVisibilidadeOpcoes();
        }
      }

      if (correta) {
        estadoUsuario.acertosConsecutivos += 1;
        estadoUsuario.errosConsecutivos = 0;

        if (!rodadaPadraoMecanicoDetectado) {
          estadoUsuario.acertosSemPadraoMecanico += 1;
        }

        if (estadoUsuario.acertosSemPadraoMecanico >= 3) {
          modoReducaoAtivo = false;
          estadoUsuario.padroesMecanicosDetectados = 0;
          estadoUsuario.acertosSemPadraoMecanico = 0;
          aplicarVisibilidadeOpcoes();
        }
      } else {
        estadoUsuario.errosConsecutivos += 1;
        estadoUsuario.acertosConsecutivos = 0;
        estadoUsuario.acertosSemPadraoMecanico = 0;
        agendarDicaPorInatividade();
      }
    }

    function configurarRodada(container) {
      limparTimerDica();
      removerDestaqueDica();

      rodadaPadraoMecanicoDetectado = false;
      estadoUsuario.indicesClicados = [];
      estadoUsuario.tempoEntreCliques = [];
      estadoUsuario.ultimoCliqueTs = null;

      cardsAtuais = Array.from(container.querySelectorAll(".act-card-image"));
      cardCorretoAtual = cardsAtuais.find((card) => card.dataset.correct === "true") || null;

      cardsAtuais.forEach((card) => {
        card.removeEventListener("click", registrarClique);
        card.addEventListener("click", registrarClique);
      });

      aplicarVisibilidadeOpcoes();
    }

    return {
      estadoUsuario,
      configurarRodada,
    };
  }

  window.criarAdaptadorAtividade = criarAdaptadorAtividade;
})();
