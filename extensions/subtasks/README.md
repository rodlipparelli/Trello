# Trello Subtasks & Hierarchy Power-Up

Extensão (Power-Up) oficial do Trello para gerenciamento bidirecional de subtarefas, hierarquia entre cards (mestre <-> subtarefas) e medidor de execução com barra de progresso percentual dinâmica.

---

## 🎯 Funcionalidades Principais

1. **Subtarefas Atreladas a um Card Existente**:
   - Criação de subtarefas rápidas diretamente no card mestre.
   - Vinculação de cards reais existentes do quadro como subtarefas.
2. **Relacionamento Bidirecional (Mão-Dupla)**:
   - **No Card Mestre**: exibe a lista completa de subtarefas, links diretos para cada card vinculado, checkboxes de conclusão e medidores de progresso.
   - **No Card Subtarefa (Filho)**: exibe um banner de destaque informando `"↳ Subtarefa de: [Nome do Card Mestre]"` com link para navegar direto ao card pai e opção de desvinculação.
3. **Medidor de Execução e Progresso Percentual**:
   - **No Quadro (Board View)**: badge dinâmico no card exibindo `X/Y (Z%)` (ex.: `8/15 (53%)`) com indicação de cor (verde para 100%, azul para em andamento).
   - **No Detalhe do Card (Card Detail)**: badge no topo com métricas de conclusão.
   - **No Verso do Card (Card Back Section)**: barra de progresso visual fluida e responsiva com percentual dinâmico calculado por `Math.round((concluídas / total) * 100)`.

---

## 🏗️ Estrutura do Power-Up

```
extensions/subtasks/
├── public/
│   ├── connector.html      # Endpoint do Power-Up (inicialização das capabilities)
│   ├── card-back.html      # Seção embutida no card com a lista, progresso e ações
│   ├── link-modal.html     # Popup para buscar e vincular cards existentes do quadro
│   ├── css/
│   │   └── style.css       # Estilização inspirada no Atlassian/Trello Design System
│   ├── js/
│   │   ├── connector.js    # Registrador de capabilities (badges, card-back, botões)
│   │   ├── card-back.js    # Lógica de renderização, checkboxes, cálculo percentual
│   │   └── link-modal.js   # Lógica de busca e vinculação de cards do quadro
│   └── assets/
│       └── icon.svg        # Ícone do Power-Up
├── server.js               # Servidor local Node.js com headers de CORS e iframe
├── package.json
└── README.md
```

---

## 🚀 Como Executar Localmente

### 1. Iniciar o Servidor Local
Na raiz do projeto ou dentro da pasta `extensions/subtasks`:

```bash
# A partir da raiz:
npm run start:subtasks

# Ou no modo watch (desenvolvimento):
npm run dev:subtasks
```

O servidor iniciará em `http://localhost:3000`.

---

## 🌐 Como Expor com HTTPS (Requisito do Trello)

O Trello exige que os conectores de Power-Up sejam servidos via **HTTPS**. Para testar localmente em seu próprio quadro do Trello, você pode expor sua porta 3000 de forma gratuita e rápida usando qualquer uma das opções:

### Opção A: Cloudflare Tunnel (Recomendado - Gratuito e sem cadastro)
```bash
npx cloudflared tunnel --url http://localhost:3000
```
Copie a URL HTTPS gerada (exemplo: `https://seu-subdominio.trycloudflare.com`).

### Opção B: Ngrok
```bash
npx ngrok http 3000
```
Copie a URL HTTPS gerada (exemplo: `https://seu-id.ngrok-free.app`).

### Opção C: Deploy no GitHub Pages (Automático e Gratuito)
Este repositório possui uma GitHub Action já configurada em [`.github/workflows/deploy-pages.yml`](../../.github/workflows/deploy-pages.yml).

1. No repositório no GitHub, vá em **Settings** > **Pages**.
2. Em **Build and deployment > Source**, escolha **GitHub Actions**.
3. A cada push na branch `main`, o deploy será realizado automaticamente.
4. A URL pública HTTPS do conector será:
   ```text
   https://<seu-usuario>.github.io/<nome-do-repositorio>/connector.html
   ```


---

## ⚙️ Como Cadastrar e Ativar o Power-Up no Trello

1. Acesse o **Trello Power-Up Developer Portal**:
   👉 [https://trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Clique em **"New Power-Up"** (ou "Criar Novo Power-Up").
3. Preencha as informações básicas:
   - **Name**: `Subtasks & Hierarchy`
   - **Workspace**: Selecione seu workspace de trabalho.
   - **Iframe connector URL**: Insira a URL HTTPS apontando para `connector.html`.  
     Exemplo: `https://seu-tunnel.trycloudflare.com/connector.html`
4. Vá na aba **Capabilities** e certifique-se de marcar:
   - `Card Badges`
   - `Card Detail Badges`
   - `Card Back Section`
   - `Card Buttons`
5. Salve as configurações.
6. Abra seu quadro no Trello, clique em **Power-Ups** no menu superior direito, vá em **"Custom"** (Personalizados) e clique em **"Adicionar" / "Habilitar"** no seu Power-Up recém-criado.

Pronto! Agora qualquer card do quadro terá a seção de subtarefas, medidor percentual e a capacidade de vincular e gerenciar cards filhos e mestres com mão-dupla!
