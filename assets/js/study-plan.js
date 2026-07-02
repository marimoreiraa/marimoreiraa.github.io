(function () {
  const config = window.STUDY_PLAN_CONFIG;
  const wrap = document.getElementById("study-plan-wrap");
  const filtersContainer = document.getElementById("study-filters");
  const sessionsContainer = document.getElementById("study-sessions-list");
  const progressLabel = document.getElementById("study-progress-label");
  const progressFill = document.getElementById("study-pb-fill");
  const headerTitle = document.getElementById("study-plan-title");
  const headerPills = document.getElementById("study-plan-pills");
  const stats = document.getElementById("study-plan-stats");

  if (!config || !wrap || !filtersContainer || !sessionsContainer || !progressLabel || !progressFill || !headerTitle || !headerPills || !stats) {
    return;
  }

  const storageKey = "studyPlanState:" + config.id;
  const colors = {
    fundamentos: { bg: "#EDE4FB", text: "#5F429D" },
    computacao: { bg: "#EFE7FD", text: "#6F53B7" },
    dados: { bg: "#F4ECFF", text: "#7A5FBC" },
    seguranca: { bg: "#F7EFFF", text: "#5A3F90" },
    plataforma: { bg: "#EDE4FB", text: "#5F429D" },
    automacao: { bg: "#EFE7FD", text: "#6F53B7" },
    entrega: { bg: "#F4ECFF", text: "#7A5FBC" }
  };

  let filter = "all";
  let expanded = {};
  let completed = parseState();

  function parseState() {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return Array.isArray(raw.completed) ? raw.completed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify({ completed: completed }));
  }

  function isDone(num) {
    return completed.indexOf(num) >= 0;
  }

  function toggleDone(num) {
    if (isDone(num)) {
      completed = completed.filter(function (item) {
        return item !== num;
      });
    } else {
      completed.push(num);
    }
    saveState();
    render();
  }

  function toggleExpanded(num) {
    expanded[num] = !expanded[num];
    render();
  }

  function renderHeader() {
    headerTitle.textContent = config.title;
    headerPills.innerHTML = '' +
      '<span class="study-pill study-pill-blue">' + config.sessions.length + ' sessoes</span>' +
      '<span class="study-pill study-pill-green">Regra 80/20</span>';

    stats.innerHTML = config.stats.map(function (stat) {
      return '<article class="study-stat-card"><div class="study-stat-label">' + stat.label + '</div><div class="study-stat-value">' + stat.value + '</div></article>';
    }).join('');
  }

  function updateProgress() {
    const total = config.sessions.length;
    const done = completed.length;
    progressLabel.textContent = done + ' / ' + total + ' sessoes';
    progressFill.style.width = Math.round((done / total) * 100) + '%';
  }

  function renderSessions() {
    const filtered = config.sessions.filter(function (session) {
      return filter === 'all' || session.category === filter;
    });

    sessionsContainer.innerHTML = filtered.map(function (session) {
      const color = colors[session.category] || colors.fundamentos;
      const openClass = expanded[session.num] ? 'open' : '';
      const done = isDone(session.num);

      return (
        '<article class="study-session-card">' +
          '<button class="study-session-header" type="button" data-action="toggle" data-id="' + session.num + '">' +
            '<span class="study-session-num" style="background:' + color.bg + ';color:' + color.text + '">' + session.num + '</span>' +
            '<span class="study-session-title ' + (done ? 'is-done' : '') + '">' + session.title + '</span>' +
            '<span class="study-session-meta">' +
              '<span class="study-pill" style="background:' + color.bg + ';color:' + color.text + '">' + session.duration + '</span>' +
              '<span class="study-chevron ' + openClass + '"><i class="fa-solid fa-chevron-down"></i></span>' +
            '</span>' +
          '</button>' +
          '<div class="study-session-body ' + openClass + '">' +
            '<div class="study-body-block">' +
              '<h4 class="study-label">Topicos da sessao</h4>' +
              '<ul class="study-topic-list">' + session.topics.map(function (topic) { return '<li>' + topic + '</li>'; }).join('') + '</ul>' +
            '</div>' +
            '<div class="study-body-block">' +
              '<h4 class="study-label">Recursos recomendados</h4>' +
              '<div class="study-resource-list">' + session.resources.map(function (resource) { return '<a href="' + resource.url + '" target="_blank" rel="noreferrer">' + resource.label + '</a>'; }).join('') + '</div>' +
            '</div>' +
            '<div class="study-review-box">' +
              '<h4 class="study-label">Revisao</h4>' +
              '<ul class="study-review-list">' + session.review.map(function (question) { return '<li>' + question + '</li>'; }).join('') + '</ul>' +
            '</div>' +
            '<div class="study-session-actions">' +
              '<button class="btn secondary" type="button" data-action="done" data-id="' + session.num + '">' + (done ? 'Desmarcar' : 'Marcar feita') + '</button>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    updateProgress();
  }

  function renderFilters() {
    filtersContainer.innerHTML = config.filters.map(function (item, index) {
      return '<button class="study-filter-btn ' + (index === 0 ? 'active' : '') + '" data-filter="' + item.value + '" type="button">' + item.label + '</button>';
    }).join('');
  }

  function render() {
    renderSessions();
  }

  filtersContainer.addEventListener('click', function (event) {
    const target = event.target;
    if (!target.matches('button[data-filter]')) return;

    filter = target.getAttribute('data-filter') || 'all';
    filtersContainer.querySelectorAll('button[data-filter]').forEach(function (button) {
      button.classList.toggle('active', button === target);
    });
    render();
  });

  sessionsContainer.addEventListener('click', function (event) {
    const toggleButton = event.target.closest('button[data-action="toggle"]');
    if (toggleButton) {
      toggleExpanded(Number(toggleButton.getAttribute('data-id')));
      return;
    }

    const doneButton = event.target.closest('button[data-action="done"]');
    if (doneButton) {
      toggleDone(Number(doneButton.getAttribute('data-id')));
    }
  });

  renderHeader();
  renderFilters();
  render();
})();
