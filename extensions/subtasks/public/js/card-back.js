/* global TrelloPowerUp */

const t = window.TrelloPowerUp.iframe();

let currentCard = null;
let currentSubtasks = [];
let parentInfo = null;
let boardLists = [];
let boardCards = [];
let boardCardsMap = new Map();
let boardListsMap = new Map();

// Elementos do DOM
const parentContainer = document.getElementById('parent-container');
const parentCardLink = document.getElementById('parent-card-link');
const unlinkParentBtn = document.getElementById('unlink-parent-btn');
const changeParentBtn = document.getElementById('change-parent-btn');
const addParentRow = document.getElementById('add-parent-row');
const addParentBtn = document.getElementById('add-parent-btn');

const parentSelectPanel = document.getElementById('parent-select-panel');
const searchParentInput = document.getElementById('search-parent-input');
const parentCardsList = document.getElementById('parent-cards-list');
const closeParentPanelBtn = document.getElementById('close-parent-panel-btn');

const progressBarContainer = document.getElementById('progress-bar-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentage = document.getElementById('progress-percentage');
const progressStats = document.getElementById('progress-stats');

const subtasksList = document.getElementById('subtasks-list');
const emptyState = document.getElementById('empty-state');

const subtaskSelectPanel = document.getElementById('subtask-select-panel');
const searchSubtaskInput = document.getElementById('search-subtask-input');
const subtaskCardsList = document.getElementById('subtask-cards-list');
const closeSubtaskPanelBtn = document.getElementById('close-subtask-panel-btn');
const openSubtaskPanelBtn = document.getElementById('open-subtask-panel-btn');

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

// Redimensionamento suave
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
      const listName = boardListsMap.get(cardObj.idList);
      if (isDoneListName(listName)) return true;
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

// Renderiza subtarefas vinculadas
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
      const listName = boardListsMap.get(cardObj.idList);
      if (listName) {
        currentListName = listName;
        if (isDoneListName(listName)) isCompleted = true;
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
    titleLink.title = 'Clique para abrir este cartão no Trello';

    titleLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (subtask.cardId) {
        t.showCard(subtask.cardId);
      }
    });

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(titleLink);

    if (currentListName) {
      const listBadge = document.createElement('span');
      listBadge.className = 'card-picker-list-name';
      listBadge.textContent = currentListName;
      leftDiv.appendChild(listBadge);
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'subtask-actions';

    const unlinkBtn = document.createElement('button');
    unlinkBtn.className = 'subtask-btn';
    unlinkBtn.innerHTML = '✕';
    unlinkBtn.title = 'Desvincular este cartão';
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
    parentSelectPanel.style.display = 'none';

    parentCardLink.textContent = parentInfo.parentTitle || 'Card Mestre';
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

// Renderiza lista no painel de seleção de Pai
function renderParentPicker(query = '') {
  parentCardsList.innerHTML = '';
  const q = query.toLowerCase().trim();

  const available = boardCards.filter((c) => {
    if (c.id === currentCard.id) return false;
    if (c.closed) return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    return true;
  });

  if (available.length === 0) {
    parentCardsList.innerHTML = '<div class="empty-state">Nenhum cartão encontrado.</div>';
    resize();
    return;
  }

  available.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'card-picker-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'card-picker-name';
    nameSpan.textContent = c.name;

    const listSpan = document.createElement('span');
    listSpan.className = 'card-picker-list-name';
    listSpan.textContent = boardListsMap.get(c.idList) || '';

    item.appendChild(nameSpan);
    item.appendChild(listSpan);

    item.addEventListener('click', async () => {
      await setParentCard(c);
    });

    parentCardsList.appendChild(item);
  });

  resize();
}

// Renderiza lista no painel de seleção de Subtarefas
function renderSubtaskPicker(query = '') {
  subtaskCardsList.innerHTML = '';
  const q = query.toLowerCase().trim();

  const existingIds = new Set(currentSubtasks.map((st) => st.cardId).filter(Boolean));

  const available = boardCards.filter((c) => {
    if (c.id === currentCard.id) return false;
    if (c.closed) return false;
    if (existingIds.has(c.id)) return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    return true;
  });

  if (available.length === 0) {
    subtaskCardsList.innerHTML = '<div class="empty-state">Nenhum outro cartão disponível.</div>';
    resize();
    return;
  }

  available.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'card-picker-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'card-picker-name';
    nameSpan.textContent = c.name;

    const listSpan = document.createElement('span');
    listSpan.className = 'card-picker-list-name';
    listSpan.textContent = boardListsMap.get(c.idList) || '';

    item.appendChild(nameSpan);
    item.appendChild(listSpan);

    item.addEventListener('click', async () => {
      await linkCardAsSubtask(c);
    });

    subtaskCardsList.appendChild(item);
  });

  resize();
}

// Define um cartão como Pai (Mão-dupla)
async function setParentCard(parentCard) {
  try {
    const subtaskId = `st_card_${currentCard.id}`;

    // 1. Salva a referência do pai neste cartão filho
    parentInfo = {
      parentId: parentCard.id,
      parentTitle: parentCard.name,
      parentUrl: parentCard.url,
      subtaskId: subtaskId,
    };
    await t.set('card', 'shared', 'subtask_parent', parentInfo);

    // 2. Salva este cartão como subtarefa no cartão pai
    try {
      const parentData = await t.get(parentCard.id, 'shared', 'subtasks_data');
      const pSubtasks = (parentData && Array.isArray(parentData.subtasks)) ? parentData.subtasks : [];
      const filtered = pSubtasks.filter((st) => st.cardId !== currentCard.id);
      filtered.push({
        id: subtaskId,
        cardId: currentCard.id,
        title: currentCard.name,
        url: currentCard.url,
        completed: !!currentCard.dueComplete,
        createdAt: new Date().toISOString(),
      });
      await t.set(parentCard.id, 'shared', 'subtasks_data', { subtasks: filtered });
    } catch (err) {
      console.warn('Aviso: atualização do pai:', err);
    }

    parentSelectPanel.style.display = 'none';
    renderParentSection();
  } catch (error) {
    console.error('Erro ao definir cartão pai:', error);
  }
}

// Vincula um cartão como subtarefa (Mão-dupla)
async function linkCardAsSubtask(card) {
  try {
    const subtaskId = `st_card_${card.id}`;

    currentSubtasks.push({
      id: subtaskId,
      cardId: card.id,
      title: card.name,
      url: card.url,
      completed: !!card.dueComplete,
      createdAt: new Date().toISOString(),
    });

    await t.set('card', 'shared', 'subtasks_data', { subtasks: currentSubtasks });

    // Salva referência de pai no cartão filho
    try {
      await t.set(card.id, 'shared', 'subtask_parent', {
        parentId: currentCard.id,
        parentTitle: currentCard.name,
        parentUrl: currentCard.url,
        subtaskId: subtaskId,
      });
    } catch (err) {
      console.warn('Aviso: definir parent no filho:', err);
    }

    subtaskSelectPanel.style.display = 'none';
    renderSubtasks();
  } catch (error) {
    console.error('Erro ao vincular cartão como subtarefa:', error);
  }
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

  await t.set('card', 'shared', 'subtasks_data', { subtasks: currentSubtasks });
  updateProgressBar();
  renderSubtasks();
}

// Desvincula subtarefa
async function removeSubtask(id, cardId) {
  currentSubtasks = currentSubtasks.filter((st) => st.id !== id);

  if (cardId) {
    try {
      await t.set(cardId, 'shared', 'subtask_parent', null);
    } catch (e) {
      console.warn('Aviso desvincular filho:', e);
    }
  }

  await t.set('card', 'shared', 'subtasks_data', { subtasks: currentSubtasks });
  updateProgressBar();
  renderSubtasks();
}

// Desvincula do cartão pai
async function unlinkFromParent() {
  if (!parentInfo || !parentInfo.parentId) return;

  const parentId = parentInfo.parentId;

  try {
    const parentData = await t.get(parentId, 'shared', 'subtasks_data');
    if (parentData && Array.isArray(parentData.subtasks)) {
      const updated = parentData.subtasks.filter(
        (st) => st.cardId !== currentCard.id && st.id !== parentInfo.subtaskId
      );
      await t.set(parentId, 'shared', 'subtasks_data', { subtasks: updated });
    }
  } catch (e) {
    console.warn('Erro ao atualizar card pai:', e);
  }

  await t.set('card', 'shared', 'subtask_parent', null);
  parentInfo = null;
  renderParentSection();
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
    boardCards = cards || [];

    boardCardsMap.clear();
    boardCards.forEach((c) => boardCardsMap.set(c.id, c));

    boardListsMap.clear();
    boardLists.forEach((l) => boardListsMap.set(l.id, l.name));

    currentSubtasks = (subtasksData && Array.isArray(subtasksData.subtasks)) ? subtasksData.subtasks : [];
    parentInfo = parentData || null;

    renderParentSection();
    renderSubtasks();
  } catch (error) {
    console.error('Erro ao carregar Power-Up:', error);
  }
}

// Event Listeners
addParentBtn.addEventListener('click', () => {
  const isHidden = parentSelectPanel.style.display === 'none';
  parentSelectPanel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    renderParentPicker();
    searchParentInput.focus();
  }
  resize();
});

changeParentBtn.addEventListener('click', () => {
  parentSelectPanel.style.display = 'block';
  renderParentPicker();
  searchParentInput.focus();
  resize();
});

closeParentPanelBtn.addEventListener('click', () => {
  parentSelectPanel.style.display = 'none';
  resize();
});

searchParentInput.addEventListener('input', (e) => {
  renderParentPicker(e.target.value);
});

unlinkParentBtn.addEventListener('click', async () => {
  if (confirm('Deseja realmente desvincular este cartão do seu cartão pai?')) {
    await unlinkFromParent();
  }
});

openSubtaskPanelBtn.addEventListener('click', () => {
  const isHidden = subtaskSelectPanel.style.display === 'none';
  subtaskSelectPanel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    renderSubtaskPicker();
    searchSubtaskInput.focus();
  }
  resize();
});

closeSubtaskPanelBtn.addEventListener('click', () => {
  subtaskSelectPanel.style.display = 'none';
  resize();
});

searchSubtaskInput.addEventListener('input', (e) => {
  renderSubtaskPicker(e.target.value);
});

toggleThemeBtn.addEventListener('click', toggleTheme);

window.addEventListener('focus', init);

t.render(init);
