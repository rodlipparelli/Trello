/* global TrelloPowerUp */

const t = window.TrelloPowerUp.iframe();

let currentCard = null;
let currentSubtasks = [];
let parentInfo = null;
let boardLists = [];
let boardCardsMap = new Map();

// Elementos do DOM
const parentContainer = document.getElementById('parent-container');
const parentCardLink = document.getElementById('parent-card-link');
const unlinkParentBtn = document.getElementById('unlink-parent-btn');
const changeParentBtn = document.getElementById('change-parent-btn');
const addParentRow = document.getElementById('add-parent-row');
const addParentBtn = document.getElementById('add-parent-btn');

const progressBarContainer = document.getElementById('progress-bar-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentage = document.getElementById('progress-percentage');
const progressStats = document.getElementById('progress-stats');

const subtasksList = document.getElementById('subtasks-list');
const emptyState = document.getElementById('empty-state');

const addSubtaskForm = document.getElementById('add-subtask-form');
const subtaskInput = document.getElementById('subtask-input');

const linkExistingCardBtn = document.getElementById('link-existing-card-btn');
const toggleThemeBtn = document.getElementById('toggle-theme-btn');
const themeIcon = document.getElementById('theme-icon');

// Gestão de Tema
function initTheme() {
  const savedTheme = localStorage.getItem('trello_subtasks_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeIcon.textContent = '🌙';
  } else {
    document.body.classList.remove('light-theme');
    themeIcon.textContent = '☀️';
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('trello_subtasks_theme', isLight ? 'light' : 'dark');
  themeIcon.textContent = isLight ? '🌙' : '☀️';
  resize();
}

initTheme();

// Redimensionamento
function resize() {
  setTimeout(() => {
    t.sizeTo('#container').catch(() => {});
  }, 40);
}

// Verifica se uma lista indica conclusão
function isDoneListName(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return (
    n.includes('conclu') ||
    n.includes('done') ||
    n.includes('finaliz') ||
    n.includes('pronto') ||
    n.includes('feitas') ||
    n.includes('feito') ||
    n.includes('entregue')
  );
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

  const completed = currentSubtasks.filter((st) => {
    if (st.completed) return true;
    if (st.cardId && boardCardsMap.has(st.cardId)) {
      const cardObj = boardCardsMap.get(st.cardId);
      if (cardObj.dueComplete) return true;
      const listObj = boardLists.find((l) => l.id === cardObj.idList);
      if (listObj && isDoneListName(listObj.name)) return true;
    }
    return false;
  }).length;

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

// Renderiza subtarefas
function renderSubtasks() {
  subtasksList.innerHTML = '';

  currentSubtasks.forEach((subtask) => {
    const li = document.createElement('li');
    li.className = 'subtask-item';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'subtask-left';

    let isCompleted = !!subtask.completed;
    let currentListName = '';

    if (subtask.cardId && boardCardsMap.has(subtask.cardId)) {
      const cardObj = boardCardsMap.get(subtask.cardId);
      if (cardObj.dueComplete) isCompleted = true;
      const listObj = boardLists.find((l) => l.id === cardObj.idList);
      if (listObj) {
        currentListName = listObj.name;
        if (isDoneListName(listObj.name)) isCompleted = true;
      }
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'subtask-checkbox';
    checkbox.checked = isCompleted;

    checkbox.addEventListener('change', () => {
      toggleSubtask(subtask.id);
    });

    const titleLink = document.createElement('a');
    titleLink.className = `subtask-title-link ${isCompleted ? 'completed' : ''}`;
    titleLink.textContent = subtask.title;
    titleLink.title = subtask.cardId ? 'Clique para abrir este cartão no Trello' : '';

    if (subtask.cardId) {
      titleLink.addEventListener('click', (e) => {
        e.preventDefault();
        t.showCard(subtask.cardId);
      });
    }

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(titleLink);

    if (currentListName) {
      const listBadge = document.createElement('span');
      listBadge.className = 'list-name-badge';
      listBadge.textContent = currentListName;
      leftDiv.appendChild(listBadge);
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'subtask-actions';

    const unlinkBtn = document.createElement('button');
    unlinkBtn.className = 'subtask-btn';
    unlinkBtn.innerHTML = '✕';
    unlinkBtn.title = 'Remover subtarefa';
    unlinkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSubtask(subtask.id, subtask.cardId);
    });

    actionsDiv.appendChild(unlinkBtn);

    li.appendChild(leftDiv);
    li.appendChild(actionsDiv);
    subtasksList.appendChild(li);
  });

  updateProgressBar();
  resize();
}

// Renderiza a seção do card pai
function renderParentSection() {
  if (parentInfo && parentInfo.parentId) {
    parentContainer.style.display = 'block';
    addParentRow.style.display = 'none';

    parentCardLink.textContent = parentInfo.parentTitle || 'Card Mestre';
    parentCardLink.href = parentInfo.parentUrl || '#';
    parentCardLink.onclick = (e) => {
      e.preventDefault();
      t.showCard(parentInfo.parentId);
    };
  } else {
    parentContainer.style.display = 'none';
    addParentRow.style.display = 'block';
  }
  resize();
}

// Salva subtarefas
async function saveSubtasks() {
  await t.set('card', 'shared', 'subtasks_data', { subtasks: currentSubtasks });
  updateProgressBar();
}

// Alterna status de conclusão
async function toggleSubtask(id) {
  const subtask = currentSubtasks.find((st) => st.id === id);
  if (!subtask) return;

  subtask.completed = !subtask.completed;
  subtask.completedAt = subtask.completed ? new Date().toISOString() : null;

  if (subtask.cardId) {
    try {
      await t.set(subtask.cardId, 'shared', 'subtask_status', {
        completed: subtask.completed,
      });
    } catch (e) {
      console.warn('Aviso sincronização:', e);
    }
  }

  await saveSubtasks();
  renderSubtasks();
}

// Remove/Desvincula subtarefa
async function removeSubtask(id, cardId) {
  currentSubtasks = currentSubtasks.filter((st) => st.id !== id);

  if (cardId) {
    try {
      await t.set(cardId, 'shared', 'subtask_parent', null);
    } catch (e) {
      console.warn('Aviso desvincular filho:', e);
    }
  }

  await saveSubtasks();
  renderSubtasks();
}

// Desvincula do card pai
async function unlinkFromParent() {
  if (!parentInfo || !parentInfo.parentId) return;

  const parentId = parentInfo.parentId;

  try {
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

  await t.set('card', 'shared', 'subtask_parent', null);
  parentInfo = null;
  renderParentSection();
}

// Adiciona nova subtarefa diretamente
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
  subtaskInput.value = '';
  renderSubtasks();
}

// Inicialização
async function init() {
  try {
    initTheme();

    const [card, lists, cards, subtasksData, parentData] = await Promise.all([
      t.card('id', 'name', 'url', 'idList'),
      t.lists('id', 'name'),
      t.cards('id', 'name', 'url', 'idList', 'dueComplete', 'closed'),
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
    ]);

    currentCard = card;
    boardLists = lists || [];

    boardCardsMap.clear();
    if (Array.isArray(cards)) {
      cards.forEach((c) => boardCardsMap.set(c.id, c));
    }

    currentSubtasks = (subtasksData && Array.isArray(subtasksData.subtasks)) ? subtasksData.subtasks : [];
    parentInfo = parentData || null;

    renderParentSection();
    renderSubtasks();
  } catch (error) {
    console.error('Erro ao carregar Power-Up:', error);
  }
}

// Event Listeners
addSubtaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await addSubtask(subtaskInput.value);
  subtaskInput.focus();
});

unlinkParentBtn.addEventListener('click', async () => {
  if (confirm('Deseja realmente desvincular este cartão do seu cartão mestre?')) {
    await unlinkFromParent();
  }
});

changeParentBtn.addEventListener('click', () => {
  t.popup({
    title: 'Alterar Cartão Pai (Parent)',
    url: './link-modal.html?mode=parent&v=4',
    height: 360,
  });
});

addParentBtn.addEventListener('click', () => {
  t.popup({
    title: 'Definir Cartão Pai (Add Parent)',
    url: './link-modal.html?mode=parent&v=4',
    height: 360,
  });
});

linkExistingCardBtn.addEventListener('click', () => {
  t.popup({
    title: 'Vincular Cartão do Quadro (Add Subtask)',
    url: './link-modal.html?mode=subtask&v=4',
    height: 360,
  });
});

toggleThemeBtn.addEventListener('click', toggleTheme);

window.addEventListener('focus', init);

t.render(init);
