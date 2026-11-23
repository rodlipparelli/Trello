/* global TrelloPowerUp */

const t = window.TrelloPowerUp.iframe();

let currentCard = null;
let currentSubtasks = [];
let parentInfo = null;

// Elementos do DOM
const parentBanner = document.getElementById('parent-card-banner');
const parentLink = document.getElementById('parent-card-link');
const unlinkParentBtn = document.getElementById('unlink-parent-btn');

const progressBarContainer = document.getElementById('progress-bar-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentage = document.getElementById('progress-percentage');
const progressStats = document.getElementById('progress-stats');

const subtasksList = document.getElementById('subtasks-list');
const emptyState = document.getElementById('empty-state');
const addSubtaskForm = document.getElementById('add-subtask-form');
const subtaskInput = document.getElementById('subtask-input');
const linkExistingCardBtn = document.getElementById('link-existing-card-btn');

// Ajusta a altura do iframe dinamicamente no Trello
function resize() {
  t.sizeTo('#container').catch(() => {});
}

// Atualiza o medidor de progresso
function updateProgressBar() {
  const total = currentSubtasks.length;
  if (total === 0) {
    progressBarContainer.style.display = 'none';
    progressStats.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  progressBarContainer.style.display = 'flex';
  progressStats.style.display = 'inline-block';

  const completed = currentSubtasks.filter((st) => st.completed).length;
  const percentage = Math.round((completed / total) * 100);

  progressBarFill.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
  progressStats.textContent = `${completed} de ${total} concluídas (${percentage}%)`;

  if (percentage === 100) {
    progressBarFill.classList.add('complete');
    progressPercentage.classList.add('complete');
    progressStats.classList.add('completed');
  } else {
    progressBarFill.classList.remove('complete');
    progressPercentage.classList.remove('complete');
    progressStats.classList.remove('completed');
  }
}

// Renderiza a lista de subtarefas
function renderSubtasks() {
  subtasksList.innerHTML = '';

  currentSubtasks.forEach((subtask, index) => {
    const li = document.createElement('li');
    li.className = 'subtask-item';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'subtask-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'subtask-checkbox';
    checkbox.checked = !!subtask.completed;
    checkbox.id = `subtask-${subtask.id}`;

    checkbox.addEventListener('change', () => {
      toggleSubtask(subtask.id);
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = `subtask-title ${subtask.completed ? 'completed' : ''}`;
    titleSpan.textContent = subtask.title;
    titleSpan.addEventListener('click', () => {
      toggleSubtask(subtask.id);
    });

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(titleSpan);

    // Se a subtask for um card vinculado no Trello
    if (subtask.cardId) {
      const cardBadge = document.createElement('a');
      cardBadge.className = 'card-link-badge';
      cardBadge.href = subtask.url || '#';
      cardBadge.target = '_blank';
      cardBadge.title = 'Abrir card vinculado no Trello';
      cardBadge.innerHTML = 'Card ↗';

      // Se clicar no link do card, abre no Trello
      cardBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (subtask.cardId) {
          t.showCard(subtask.cardId);
        }
      });

      leftDiv.appendChild(cardBadge);
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'subtask-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'subtask-btn';
    deleteBtn.innerHTML = subtask.cardId ? 'Desvincular' : '✕';
    deleteBtn.title = subtask.cardId ? 'Desvincular este card' : 'Remover subtarefa';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSubtask(subtask.id, subtask.cardId);
    });

    actionsDiv.appendChild(deleteBtn);

    li.appendChild(leftDiv);
    li.appendChild(actionsDiv);
    subtasksList.appendChild(li);
  });

  updateProgressBar();
  resize();
}

// Renderiza o banner do card mestre (se este card for subtarefa de outro)
function renderParentBanner() {
  if (parentInfo && parentInfo.parentId) {
    parentBanner.style.display = 'flex';
    parentLink.textContent = parentInfo.parentTitle || 'Card Mestre';
    parentLink.href = parentInfo.parentUrl || '#';
    parentLink.onclick = (e) => {
      e.preventDefault();
      t.showCard(parentInfo.parentId);
    };
  } else {
    parentBanner.style.display = 'none';
  }
  resize();
}

// Salva as subtarefas no Trello
async function saveSubtasks() {
  await t.set('card', 'shared', 'subtasks_data', { subtasks: currentSubtasks });
  updateProgressBar();
}

// Alterna o status de concluído de uma subtarefa
async function toggleSubtask(id) {
  const subtask = currentSubtasks.find((st) => st.id === id);
  if (!subtask) return;

  subtask.completed = !subtask.completed;
  subtask.completedAt = subtask.completed ? new Date().toISOString() : null;

  // Se for um card vinculado, atualiza status também no card filho
  if (subtask.cardId) {
    try {
      await t.set(subtask.cardId, 'shared', 'subtask_status', {
        completed: subtask.completed,
      });
    } catch (e) {
      console.warn('Não foi possível sincronizar diretamente com o card filho:', e);
    }
  }

  await saveSubtasks();
  renderSubtasks();
}

// Remove uma subtarefa ou desvincula card filho
async function removeSubtask(id, cardId) {
  currentSubtasks = currentSubtasks.filter((st) => st.id !== id);

  // Se for um card do Trello, desvincula a referência inversa no card filho
  if (cardId) {
    try {
      await t.set(cardId, 'shared', 'subtask_parent', null);
    } catch (e) {
      console.warn('Não foi possível desvincular o card filho:', e);
    }
  }

  await saveSubtasks();
  renderSubtasks();
}

// Desvincula este card do seu card mestre
async function unlinkFromParent() {
  if (!parentInfo || !parentInfo.parentId) return;

  const parentId = parentInfo.parentId;

  try {
    // Busca dados do card pai para remover a referência a este card
    const parentData = await t.get(parentId, 'shared', 'subtasks_data');
    if (parentData && Array.isArray(parentData.subtasks)) {
      const updatedParentSubtasks = parentData.subtasks.filter(
        (st) => st.cardId !== currentCard.id && st.id !== parentInfo.subtaskId
      );
      await t.set(parentId, 'shared', 'subtasks_data', { subtasks: updatedParentSubtasks });
    }
  } catch (e) {
    console.warn('Erro ao atualizar card pai:', e);
  }

  // Remove a referência do card filho
  await t.set('card', 'shared', 'subtask_parent', null);
  parentInfo = null;
  renderParentBanner();
}

// Adiciona uma nova subtarefa
async function addSubtask(title) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const newSubtask = {
    id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title: trimmed,
    completed: false,
    cardId: null,
    createdAt: new Date().toISOString(),
  };

  currentSubtasks.push(newSubtask);
  await saveSubtasks();
  renderSubtasks();
}

// Carrega dados iniciais do card
async function init() {
  try {
    const [card, subtasksData, parentData] = await Promise.all([
      t.card('id', 'name', 'url'),
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
    ]);

    currentCard = card;
    currentSubtasks = (subtasksData && Array.isArray(subtasksData.subtasks)) ? subtasksData.subtasks : [];
    parentInfo = parentData || null;

    renderParentBanner();
    renderSubtasks();
  } catch (error) {
    console.error('Erro ao inicializar Power-Up Subtasks:', error);
  }
}

// Event Listeners
addSubtaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = subtaskInput.value;
  subtaskInput.value = '';
  await addSubtask(value);
  subtaskInput.focus();
});

unlinkParentBtn.addEventListener('click', async () => {
  if (confirm('Deseja realmente desvincular este card de seu card mestre?')) {
    await unlinkFromParent();
  }
});

linkExistingCardBtn.addEventListener('click', () => {
  t.popup({
    title: 'Vincular Card como Subtarefa',
    url: './link-modal.html',
    height: 360,
  });
});

// Listener para atualizar a tela quando a janela ganha foco ou recebe mensagens
window.addEventListener('focus', init);

// Inicializa
t.render(init);
