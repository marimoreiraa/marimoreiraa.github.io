(function () {
  const financeKey = "personalFinanceData";
  const studiesKey = "studyTracksData";
  const ROUTES = {
    home: "",
    espacoPessoal: "espaco-pessoal/",
    financas: "financas/",
    estudos: "estudos/",
    projetos: "projetos/",
    tcc: "tcc/config.html",
    sobre: "sobre/",
    experiencia: "experiencia/",
  };

  const navToggle = document.querySelector(".mobile-nav-toggle");
  const sidebar = document.getElementById("sidebar");

  if (navToggle && sidebar) {
    navToggle.addEventListener("click", function () {
      const isOpen = document.body.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (event) {
      if (!document.body.classList.contains("nav-open")) return;
      const clickedInsideSidebar = sidebar.contains(event.target);
      const clickedToggle = navToggle.contains(event.target);

      if (!clickedInsideSidebar && !clickedToggle) {
        document.body.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function getAppBasePath() {
    if (window.location.protocol === "file:") {
      const segments = window.location.pathname.split("/");
      const sectionNames = ["espaco-pessoal", "financas", "estudos", "projetos", "tcc", "sobre", "experiencia"];
      const sectionIndex = segments.findIndex(function (segment) {
        return sectionNames.indexOf(segment) >= 0;
      });

      if (sectionIndex === -1) return "./";

      const depth = Math.max(1, segments.length - sectionIndex - 1);
      return "../".repeat(depth);
    }

    const sectionNames = ["espaco-pessoal", "financas", "estudos", "projetos", "tcc", "sobre", "experiencia"];
    const segments = window.location.pathname.split("/").filter(Boolean);

    if (!segments.length) return "/";
    if (segments[0].includes(".")) return "/";
    if (sectionNames.indexOf(segments[0]) >= 0) return "/";

    return "/" + segments[0] + "/";
  }

  function buildRoute(routeName) {
    const routePath = ROUTES[routeName] || ROUTES.home;
    const base = getAppBasePath();

    if (base === "/") {
      return "/" + routePath;
    }

    if (base.startsWith("/")) {
      return base + routePath;
    }

    return base + routePath;
  }

  function bindNavigationRoutes() {
    const navLinks = document.querySelectorAll("a[data-route]");
    if (!navLinks.length) return;

    navLinks.forEach(function (link) {
      const route = link.getAttribute("data-route");
      if (!route) return;

      const targetUrl = buildRoute(route);
      link.setAttribute("href", targetUrl);

      link.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = targetUrl;
      });
    });
  }

  function parseStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  }

  function hydrateHomeCards() {
    const incomeEl = document.getElementById("home-income-total");
    const expenseEl = document.getElementById("home-expense-total");
    const tracksEl = document.getElementById("home-tracks-total");
    const progressEl = document.getElementById("home-study-progress");

    if (!incomeEl || !expenseEl || !tracksEl || !progressEl) return;

    const finance = parseStorage(financeKey, { transactions: [] });
    const tracks = parseStorage(studiesKey, []);

    const totalIncome = finance.transactions
      .filter(function (item) { return item.type === "income"; })
      .reduce(function (acc, item) { return acc + Number(item.amount || 0); }, 0);

    const totalExpense = finance.transactions
      .filter(function (item) { return item.type === "expense"; })
      .reduce(function (acc, item) { return acc + Number(item.amount || 0); }, 0);

    let avgProgress = 0;

    if (tracks.length) {
      const allTrackProgress = tracks.map(function (track) {
        if (!track.topics || !track.topics.length) return 0;
        const done = track.topics.filter(function (topic) { return topic.done; }).length;
        return (done / track.topics.length) * 100;
      });

      avgProgress = allTrackProgress.reduce(function (acc, value) { return acc + value; }, 0) / allTrackProgress.length;
    }

    incomeEl.textContent = formatCurrency(totalIncome);
    expenseEl.textContent = formatCurrency(totalExpense);
    tracksEl.textContent = String(tracks.length);
    progressEl.textContent = Math.round(avgProgress) + "%";
  }

  bindNavigationRoutes();
  hydrateHomeCards();
})();
