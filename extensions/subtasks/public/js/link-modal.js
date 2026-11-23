/* global TrelloPowerUp */

const t = window.TrelloPowerUp.iframe();

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'subtask'; // 'subtask' ou 'parent'

let currentCard = null;
let boardCards = [];
let boardListsMap = new Map();
let existingSubtaskCardIds = new Set();
let currentParentId = null;

const searchInput = document.getElementById('search-card-input');
const cardsContainer = document.getElementById('cards-container');

// Detecção e aplicação de tema escuro/claro
function applyTheme() {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('theme-dark', isDark);
}
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}
applyTheme();

// Filtra e renderiza os cards disponíveis
function renderCards(filterText = '') {
  cardsContainer.innerHTML = '';
  const query = filterText.toLowerCase().trim();

  const availableCards = boardCards.filter((card) => {
    // Não exibe o próprio card atual
    if (card.id === currentCard.id) return false;
    // Não exibe cards arquivados
    if (card.closed) return false;
    // Filtro de busca
    if (query && !card.name.toLowerCase().includes(query)) return false;
    return true;
  });

  if (availableCards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = query
      ? 'Nenhum cartão encontrado com esse termo.'
      : 'Nenhum outro cartão disponível neste quadro.';
    cardsContainer.appendChild(empty);
    t.sizeTo(cardsContainer).catch(() => {});
    return;
  }

  availableCards.forEach((card) => {
    const isAlreadySubtask = existingSubtaskCardIds.has(card.id);
    const isCurrentParent = currentParentId === card.id;

    const item = document.createElement('div');
    item.className = 'card-select-item';

    if (mode === 'subtask' && isAlreadySubtask) {
      item.style.opacity = '0.5';
      item.style.cursor = 'not-allowed';
    } else if (mode === 'parent' && isCurrentParent) {
      item.style.opacity = '0.5';
      item.style.cursor = 'not-allowed';
    }

    const titleDiv = document.createElement('div');
    titleDiv.className = 'card-select-title';
    titleDiv.textContent = card.name;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'card-select-meta';

    // Lista onde o card se encontra
    const listName = boardListsMap.get(card.idList) || '';
    if (listName) {
      const listBadge = document.createElement('span');
      listBadge.className = 'card-select-list-name';
      listBadge.textContent = listName;
      metaDiv.appendChild(listBadge);
    }

    const actionSpan = document.createElement('span');
    actionSpan.className = 'card-select-list-name';

    if (mode === 'subtask') {
      actionSpan.textContent = isAlreadySubtask ? 'Já vinculado' : '+ Vincular Subtarefa';
      if (!isAlreadySubtask) {
        item.addEventListener('click', () => linkCardAsSubtask(card));
      }
    } else {
      actionSpan.textContent = isCurrentParent ? 'Pai atual' : '+ Definir como Pai';
      if (!isCurrentParent) {
        item.addEventListener('click', () => setCardAsParent(card));
      }
    }

    metaDiv.appendChild(actionSpan);
    item.appendChild(titleDiv);
    item.appendChild(metaDiv);
    cardsContainer.appendChild(item);
  });

  t.sizeTo(cardsContainer).catch(() => {});
}

// Vincula o card selecionado como Subtarefa deste card mestre
async function linkCardAsSubtask(selectedCard) {
  try {
    // 1. Atualiza lista de subtasks no card mestre
    const parentData = await t.get('card', 'shared', 'subtasks_data');
    const subtasks = (parentData && Array.isArray(parentData.subtasks)) ? parentData.subtasks : [];

    const subtaskId = `st_card_${selectedCard.id}`;

    subtasks.push({
      id: subtaskId,
      cardId: selectedCard.id,
      title: selectedCard.name,
      url: selectedCard.url,
      completed: !!selectedCard.dueComplete,
      createdAt: new Date().toISOString(),
    });

    await t.set('card', 'shared', 'subtasks_data', { subtasks });

    // 2. Define relação inversa no card filho
    try {
      await t.set(selectedCard.id, 'shared', 'subtask_parent', {
        parentId: currentCard.id,
        parentTitle: currentCard.name,
        parentUrl: currentCard.url,
        subtaskId: subtaskId,
      });
    } catch (err) {
      console.warn('Aviso: Falha ao setar no card filho:', err);
    }

    t.closePopup();
  } catch (error) {
    console.error('Erro ao vincular cartão como subtarefa:', error);
    alert('Erro ao vincular cartão.');
  }
}

// Define o card selecionado como Tarefa Pai (Parent) deste card atual
async function setCardAsParent(parentCard) {
  try {
    const subtaskId = `st_card_${currentCard.id}`;

    // 1. Salva a referência de Pai no card atual
    await t.set('card', 'shared', 'subtask_parent', {
      parentId: parentCard.id,
      parentTitle: parentCard.name,
      parentUrl: parentCard.url,
      subtaskId: subtaskId,
    });

    // 2. Adiciona este card na lista de subtasks do card Pai
    try {
      const parentSubtasksData = await t.get(parentCard.id, 'shared', 'subtasks_data');
      const subtasks = (parentSubtasksData && Array.isArray(parentSubtasksData.subtasks))
        ? parentSubtasksData.subtasks
        : [];

      // Evita duplicatas
      const filtered = subtasks.filter((st) => st.cardId !== currentCard.id);
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
      console.warn('Aviso: Falha ao atualizar lista de subtasks no card pai:', err);
    }

    t.closePopup();
  } catch (error) {
    console.error('Erro ao definir cartão pai:', error);
    alert('Erro ao definir cartão pai.');
  }
}

// Inicialização
async function init() {
  try {
    applyTheme();

    const [card, cards, lists, currentSubtasksData, currentParentData] = await Promise.all([
      t.card('id', 'name', 'url'),
      t.cards('id', 'name', 'url', 'idList', 'closed', 'dueComplete'),
      t.lists('id', 'name'),
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
    ]);

    currentCard = card;
    boardCards = cards || [];

    if (Array.isArray(lists)) {
      lists.forEach((l) => boardListsMap.set(l.id, l.name));
    }

    if (currentSubtasksData && Array.isArray(currentSubtasksData.subtasks)) {
      currentSubtasksData.subtasks.forEach((st) => {
        if (st.cardId) existingSubtaskCardIds.add(st.cardId);
      });
    }

    if (currentParentData && currentParentData.parentId) {
      currentParentId = currentParentData.parentId;
    }

    renderCards();
  } catch (err) {
    console.error('Erro ao carregar cartões para o modal:', err);
    cardsContainer.innerHTML = '<div class="empty-state">Erro ao carregar cartões do quadro.</div>';
  }
}

searchInput.addEventListener('input', (e) => {
  renderCards(e.target.value);
});

t.render(init);
