(function () {
  const projectsContainer = document.getElementById("projects-list") || document.getElementById("home-portfolio-list");
  if (!projectsContainer) return;

  const isProjectsPage = /\/projetos\//.test(window.location.pathname);
  const imageBase = isProjectsPage ? "../assets/" : "./assets/";

  const projects = [
    {
      name: "Pagerbeauty Helm Chart",
      description: "Helm Chart desenvolvido para facilitar a instalacao e uso do PagerBeauty do PagerDuty.",
      link: "https://github.com/osgurisdosre/helm-charts/tree/main/charts/pagerbeauty",
      image: "pagerbeauty.png",
    },
    {
      name: "To-do List",
      description: "Projeto de um To-do List simples com Spring Boot, Thymeleaf, PostgreSQL e hospedagem em cloud.",
      link: "https://github.com/marimoreiraa/Todolist",
      image: "todolist.png",
    },
    {
      name: "Library Management System",
      description: "Sistema de gerenciamento de biblioteca com Spring Boot, Thymeleaf, padroes de projeto e PostgreSQL.",
      link: "https://github.com/marimoreiraa/Library-Managment-System",
      image: "library.png",
    },
    {
      name: "ChatBot Telegram",
      description: "ChatBot personalizado para cliente utilizando Python.",
      link: "https://t.me/blackwin1_Bot",
      image: "chatbot.png",
    },
    {
      name: "Projeto D",
      description: "Pipeline de dados com PostgreSQL, Cassandra, Pandas, PySpark e BigQuery.",
      link: "https://github.com/marimoreiraa/ProjetoD",
      image: "projetod.png",
    },
    {
      name: "Projeto Bootcamp",
      description: "Projeto final do bootcamp com extracao, normalizacao e analise de dados com Pandas, PySpark e SparkSQL.",
      link: "https://github.com/marimoreiraa/ProjetoFinal",
      image: "bootcamp.png",
    },
  ];

  projectsContainer.innerHTML = projects
    .map(function (project) {
      return (
        '<article class="portfolio-card">' +
        '<img src="' + imageBase + project.image + '" alt="Preview do projeto ' + project.name + '">' +
        '<div class="portfolio-overlay">' +
        "<h3>" + project.name + "</h3>" +
        "<p>" + project.description + "</p>" +
        '<a href="' + project.link + '" target="_blank" rel="noreferrer" class="portfolio-action">Mais detalhes -></a>' +
        "</div>" +
        "</article>"
      );
    })
    .join("");
})();
