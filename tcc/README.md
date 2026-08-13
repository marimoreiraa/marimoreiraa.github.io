# Painel de Autonomia - MVP (Serverless / PWA)

Aplicacao web desenvolvida como Trabalho de Conclusao de Curso (Sistemas de Informacao) para apoiar a rotina diaria de uma jovem no espectro autista, nao alfabetizada. O sistema utiliza um celular Android fixo em modo paisagem como painel visual de estimulos, baseado na metodologia TEACCH.

Nesta **Versao 1.0**, a arquitetura evoluiu de um servidor local emulado (Python/Flask) para uma abordagem **Serverless (100% Frontend + Firebase)**, focada em usabilidade para o cuidador (Caregiver UX), alta disponibilidade (PWA) e privacidade de dados (Privacy by Design / LGPD).

## Estrutura do projeto

As paginas usam diretorios com `index.html` para que o GitHub Pages publique rotas sem extensao `.html`.

```text
autonomia-app/
├── login/
│   └── index.html             # Autenticacao (Multi-tenant via Firebase Auth)
├── cadastro/
│   └── index.html             # Cadastro da conta da familia
├── admin/
│   └── index.html             # Tela de gestao de tarefas do cuidador
├── painel/
│   └── index.html             # Tela fixa da jovem (Painel de Rotina)
├── manifest.json              # Configuracoes do PWA (Progressive Web App)
├── sw.js                      # Service Worker (Cache e comportamento offline)
├── firestore.rules            # Regras de seguranca e isolamento por UID
└── static/
    ├── painel/
    │   ├── style.css
    │   └── app.js              # Logica do painel e escuta do Firestore em tempo real
    ├── admin/
    │   ├── admin.css
    │   └── admin.js            # Gestao e compressao de midias (Base64)
    └── sounds/
        └── sucesso.wav         # Som de conclusao de tarefa
```

## Arquitetura e Tecnologias (Backend-as-a-Service)

- **Frontend:** HTML5, CSS3, Vanilla JavaScript.
- **Banco de Dados:** Firebase Cloud Firestore (NoSQL).
- **Autenticacao:** Firebase Auth (E-mail e Senha).
- **Hospedagem:** GitHub Pages ou Firebase Hosting.
- **Midias:** Convertidas via JavaScript (Canvas/FileReader) e armazenadas como strings **Base64** diretamente nos documentos do Firestore, conforme o limite de tamanho do documento. Para arquivos maiores, o Firebase Storage e mais adequado.

## Como rodar o projeto

Por ser uma aplicacao 100% frontend Serverless, nao ha backend local para configurar.

**Para desenvolvimento local:**

Basta usar uma extensao como o *Live Server* do VS Code, ou rodar o servidor embutido do Python na raiz da pasta:

```bash
python3 -m http.server 8000
```

Acesse `http://localhost:8000/tcc/login/` no navegador. Se o servidor for iniciado de dentro da pasta `tcc`, use `http://localhost:8000/login/`.

**Para uso em producao (familia):**

1. Acesse o link oficial hospedado, por exemplo `https://seunome.github.io/autonomia-app/tcc/login/`.
2. No celular do cuidador e no dispositivo fixo, abra as opcoes do navegador e clique em **Adicionar a Tela Inicial**.
3. O sistema sera instalado no dispositivo como um aplicativo nativo (PWA).

## Como usar

1. **Primeiro acesso:** Pelo app instalado, acesse `/tcc/login/`, clique em **Cadastrar** e crie uma conta para a familia.
2. **Painel do cuidador (`/tcc/admin/`):** Logado com a conta da familia, cadastre as tarefas diarias: titulo interno, horario, dias da semana, uma foto capturada na hora ou escolhida da galeria e um audio curto de instrucao.
3. **Painel fixo da jovem (`/tcc/painel/`):**
   - No celular fixo, faca o login uma unica vez usando a mesma conta criada.
   - Deixe o dispositivo em tela cheia, no modo paisagem, e de **um toque** na tela inicial para liberar o *autoplay* de audio.
   - Quando chega o horario de uma tarefa, o sistema exibe a foto em tela cheia, reproduz o audio gravado e mostra o botao de conclusao.
   - Tocar no botao encerra a tarefa com um som de sucesso.
   - A sincronizacao das tarefas concluidas reinicia automaticamente na virada do dia.

## Deixando o painel travado (Modo Quiosque)

Para evitar saidas acidentais do app pela usuaria:

- **Nativo do Android (Fixacao de tela):** Va em Configuracoes > Seguranca > Fixar aplicativo. Abra a tela de apps recentes e toque no icone do Painel de Autonomia para fixa-lo.
- **Alternativa (Fully Kiosk Browser):** App disponivel na Play Store que mantem a tela ligada, bloqueia notificacoes e forca o modo tela cheia do link do PWA.

## Notas tecnicas e privacidade (DSR)

- **Privacidade (Multi-tenant e LGPD):** O sistema isola os dados por familia. As regras de seguranca do Firestore garantem que as fotos da casa e a rotina da usuaria so possam ser lidas e editadas pelo usuario cujo `uid` foi salvo no documento durante o login.
- **Regras de seguranca:** Publique `firestore.rules` com `firebase deploy --only firestore:rules` e habilite o provedor **E-mail/Senha** no Firebase Authentication.
- **Tempo real (`onSnapshot`):** Diferente da V1, que fazia consultas via *polling* a cada 5 segundos, o aplicativo utiliza o ouvinte nativo do Firebase. Cadastros ou conclusoes feitas no celular do cuidador refletem em tempo real na tela do painel da jovem, sem necessidade de atualizar a pagina.
- **Autoplay de audio:** Como os navegadores moveis bloqueiam audios automaticos por padrao, a interface exige uma primeira interacao humana na tela de descanso para inicializar a API de audio. Uma vez ativada, os audios das tarefas poderao tocar de forma autonoma.
