# Repositório de Extensões para Trello (Power-Ups)

Repositório monorepo dedicado ao desenvolvimento, teste e disponibilização de extensões e Power-Ups para o **Trello**.

---

## 📦 Extensões Disponíveis

| Extensão | Descrição | Status |
| :--- | :--- | :--- |
| [**Subtasks & Hierarchy**](extensions/subtasks/README.md) | Subtarefas bidirecionais (mestre <-> subtask) com medidor de execução percentual (`8/15 - 53%`). | ✅ Concluída |

---

## 🛠️ Como Iniciar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18+)
- Conta no [Trello](https://trello.com) com permissão para adicionar Power-Ups.

### Comandos Rápidos
```bash
# Iniciar servidor da extensão de Subtarefas
npm run start:subtasks

# Iniciar em modo de desenvolvimento com recarregamento automático
npm run dev:subtasks
```

Consulte o [README da extensão de subtarefas](extensions/subtasks/README.md) para detalhes completos de configuração no portal de desenvolvedores do Trello e publicação.
