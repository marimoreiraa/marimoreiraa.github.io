# Dashboard Pessoal Multipagina

Sistema pessoal em HTML, CSS e JavaScript puro, pronto para deploy no GitHub Pages.

## Paginas

- `/` Home
- `/espaco-pessoal/` Hub privado para acessos internos
- `/financas/` Pagina informativa (Em desenvolvimento)
- `/estudos/` Dashboard de estudos com trilhas e progresso
- `/projetos/` Lista de projetos em cards
- `/experiencia/` Linha do tempo profissional
- `/tcc/` Area dedicada ao TCC
- `/sobre/` Perfil profissional

## Tecnologias

- HTML5
- CSS3
- JavaScript (sem frameworks)
- Font Awesome (CDN)

## Como rodar localmente

1. Abra o arquivo `index.html` no navegador.
2. Ou use uma extensao como Live Server no VS Code para navegar entre rotas por pasta.

## Deploy no GitHub Pages

1. Suba os arquivos para o repositorio.
2. Em Settings > Pages, configure a branch principal e a pasta root (`/`).
3. Acesse a URL gerada pelo GitHub Pages.

## Login do Espaco Pessoal

- Usuario: `admin`
- Senha: `1234`

## Persistencia

Os dados ficam no `localStorage` do navegador:

- `studyTracksData` trilhas e topicos de estudo
