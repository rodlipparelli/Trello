/* global TrelloPowerUp */

const t = window.TrelloPowerUp.iframe();

// App Key padrão do Trello para Power-Ups ou customizada
const DEFAULT_APP_KEY = '91950e3ce18e24fa2eb412a8706d3113';

let currentCard = null;
let currentSubtasks = [];
let parentInfo = null;
let boardLists = [];
let boardCardsMap = new Map();
let userToken = null;

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

const createCardForm = document.getElementById('create-card-form');
const subtaskCardTitle = document.getElementById('subtask-card-title');
const targetListSelect = document.getElementById('target-list-select');
const createBtn = document.getElementById('create-btn');

const apiConfigPanel = document.getElementById('api-config-panel');
const apiTokenInput = document.getElementById('api-token-input');
const saveTokenBtn = document.getElementById('save-token-btn');
const getTokenLink = document.getElementById('get-token-link');

const linkExistingCardBtn = document.getElementById('link-existing-card-btn');

// Detecção e aplicação de tema escuro/claro
function applyTheme() {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('theme-dark', isDark);
}
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}
applyTheme();

// Redimensionamento do iframe
function resize() {
  t.sizeTo('#container').catch(() => {});
}

// Verifica se uma lista tem nome indicando conclusão
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

// Popula o seletor de listas de destino
function populateListsSelect(lists, currentCardListId) {
  targetListSelect.innerHTML = '';
  lists.forEach((list) => {
    const option = document.createElement('option');
    option.value = list.id;
    option.textContent = list.name;
    // Seleciona a lista do card atual por padrão
    if (list.id === currentCardListId) {
      option.selected = true;
    }
    targetListSelect.appendChild(option);
  });
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

  // Verifica cards concluídos (via checkbox manual, dueComplete ou lista de concluído)
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

// Renderiza a lista de subtarefas
function renderSubtasks() {
  subtasksList.innerHTML = '';

  currentSubtasks.forEach((subtask) => {
    const li = document.createElement('li');
    li.className = 'subtask-item';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'subtask-left';

    // Determina se a subtask está concluída
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
    titleLink.title = 'Clique para abrir o cartão no Trello';

    titleLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (subtask.cardId) {
        t.showCard(subtask.cardId);
      }
    });

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(titleLink);

    // Badge com nome da lista atual do card filho
    if (currentListName) {
      const listBadge = document.createElement('span');
      listBadge.className = 'list-name-badge';
      listBadge.textContent = currentListName;
      listBadge.title = `Lista: ${currentListName}`;
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
      console.warn('Aviso: sincronização secundária:', e);
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
      console.warn('Aviso ao desvincular card filho:', e);
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

// Cria novo card no Trello via REST API
async function createCardOnTrello(title, targetListId) {
  createBtn.disabled = true;
  createBtn.textContent = 'Criando...';

  try {
    // 1. Verifica token do Trello
    if (!userToken) {
      userToken = await t.get('member', 'private', 'trello_token');
    }

    if (!userToken) {
      // Exibe painel para configurar token
      apiConfigPanel.classList.remove('hidden');
      resize();
      createBtn.disabled = false;
      createBtn.textContent = 'Criar Cartão';
      return;
    }

    const appKey = DEFAULT_APP_KEY;
    const url = `https://api.trello.com/1/cards?idList=${targetListId}&name=${encodeURIComponent(
      title
    )}&key=${appKey}&token=${userToken}`;

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Erro na API do Trello: ${res.statusText}`);
    }

    const newCard = await res.json();

    // 2. Vincula no Card Mestre
    const subtaskId = `st_card_${newCard.id}`;
    currentSubtasks.push({
      id: subtaskId,
      cardId: newCard.id,
      title: newCard.name,
      url: newCard.url,
      completed: false,
      createdAt: new Date().toISOString(),
    });

    boardCardsMap.set(newCard.id, newCard);
    await saveSubtasks();

    // 3. Define relação de mão-dupla no novo card criado
    try {
      await t.set(newCard.id, 'shared', 'subtask_parent', {
        parentId: currentCard.id,
        parentTitle: currentCard.name,
        parentUrl: currentCard.url,
        subtaskId: subtaskId,
      });
    } catch (err) {
      console.warn('Aviso: Falha ao setar parent no novo card via client:', err);
    }

    subtaskCardTitle.value = '';
    apiConfigPanel.classList.add('hidden');
    renderSubtasks();
  } catch (error) {
    console.error('Erro ao criar cartão no Trello:', error);
    alert('Não foi possível criar o cartão automaticamente. Verifique seu token do Trello.');
    apiConfigPanel.classList.remove('hidden');
    resize();
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = 'Criar Cartão';
  }
}

// Inicialização
async function init() {
  try {
    applyTheme();

    const [card, lists, cards, subtasksData, parentData, storedToken] = await Promise.all([
      t.card('id', 'name', 'url', 'idList'),
      t.lists('id', 'name'),
      t.cards('id', 'name', 'url', 'idList', 'dueComplete', 'closed'),
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
      t.get('member', 'private', 'trello_token'),
    ]);

    currentCard = card;
    boardLists = lists || [];
    userToken = storedToken || localStorage.getItem('trello_token') || null;

    boardCardsMap.clear();
    if (Array.isArray(cards)) {
      cards.forEach((c) => boardCardsMap.set(c.id, c));
    }

    currentSubtasks = (subtasksData && Array.isArray(subtasksData.subtasks)) ? subtasksData.subtasks : [];
    parentInfo = parentData || null;

    populateListsSelect(boardLists, currentCard.idList);
    renderParentSection();
    renderSubtasks();
  } catch (error) {
    console.error('Erro ao carregar dados do Power-Up:', error);
  }
}

// Event Listeners
createCardForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = subtaskCardTitle.value.trim();
  const targetListId = targetListSelect.value;
  if (!title || !targetListId) return;

  await createCardOnTrello(title, targetListId);
});

saveTokenBtn.addEventListener('click', async () => {
  const token = apiTokenInput.value.trim();
  if (token) {
    userToken = token;
    localStorage.setItem('trello_token', token);
    await t.set('member', 'private', 'trello_token', token);
    alert('Token salvo com sucesso! Agora você pode criar novos cartões.');
    apiConfigPanel.classList.add('hidden');
    resize();
  }
});

unlinkParentBtn.addEventListener('click', async () => {
  if (confirm('Deseja realmente desvincular este cartão do seu cartão mestre?')) {
    await unlinkFromParent();
  }
});

changeParentBtn.addEventListener('click', () => {
  t.popup({
    title: 'Alterar Cartão Pai (Parent)',
    url: './link-modal.html?mode=parent',
    height: 360,
  });
});

addParentBtn.addEventListener('click', () => {
  t.popup({
    title: 'Definir Cartão Pai (Add Parent)',
    url: './link-modal.html?mode=parent',
    height: 360,
  });
});

linkExistingCardBtn.addEventListener('click', () => {
  t.popup({
    title: 'Vincular Subtarefa (Add Subtask)',
    url: './link-modal.html?mode=subtask',
    height: 360,
  });
});

window.addEventListener('focus', init);

t.render(init);
