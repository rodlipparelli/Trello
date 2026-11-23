/* global TrelloPowerUp */

const t = window.TrelloPowerUp.iframe();

let currentCard = null;
let boardCards = [];
let existingSubtaskCardIds = new Set();

const searchInput = document.getElementById('search-card-input');
const cardsContainer = document.getElementById('cards-container');

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
    empty.textContent = query ? 'Nenhum card encontrado com esse termo.' : 'Nenhum outro card disponível neste quadro.';
    cardsContainer.appendChild(empty);
    t.sizeTo(cardsContainer).catch(() => {});
    return;
  }

  availableCards.forEach((card) => {
    const isAlreadyLinked = existingSubtaskCardIds.has(card.id);

    const item = document.createElement('div');
    item.className = 'card-select-item';
    if (isAlreadyLinked) {
      item.style.opacity = '0.5';
      item.style.cursor = 'not-allowed';
    }

    const titleDiv = document.createElement('div');
    titleDiv.className = 'card-select-title';
    titleDiv.textContent = card.name;

    const actionSpan = document.createElement('span');
    actionSpan.className = 'card-select-list-name';
    actionSpan.textContent = isAlreadyLinked ? 'Já vinculado' : '+ Vincular';

    item.appendChild(titleDiv);
    item.appendChild(actionSpan);

    if (!isAlreadyLinked) {
      item.addEventListener('click', () => {
        linkCardAsSubtask(card);
      });
    }

    cardsContainer.appendChild(item);
  });

  t.sizeTo(cardsContainer).catch(() => {});
}

// Vincula o card selecionado como subtask (mão-dupla)
async function linkCardAsSubtask(selectedCard) {
  try {
    // 1. Obter lista atual de subtasks do card mestre
    const parentData = await t.get('card', 'shared', 'subtasks_data');
    const subtasks = (parentData && Array.isArray(parentData.subtasks)) ? parentData.subtasks : [];

    const subtaskId = `st_card_${selectedCard.id}`;

    // Adiciona na lista do card pai
    subtasks.push({
      id: subtaskId,
      cardId: selectedCard.id,
      title: selectedCard.name,
      url: selectedCard.url,
      completed: !!selectedCard.dueComplete,
      createdAt: new Date().toISOString(),
    });

    // Salva no card mestre
    await t.set('card', 'shared', 'subtasks_data', { subtasks });

    // 2. Salva no card filho a referência de mão dupla
    try {
      await t.set(selectedCard.id, 'shared', 'subtask_parent', {
        parentId: currentCard.id,
        parentTitle: currentCard.name,
        parentUrl: currentCard.url,
        subtaskId: subtaskId,
      });
    } catch (err) {
      console.warn('Aviso: Não foi possível definir dados no card filho:', err);
    }

    // Fecha o modal e atualiza o pai
    t.closePopup();
  } catch (error) {
    console.error('Erro ao vincular card como subtask:', error);
    alert('Erro ao vincular card. Tente novamente.');
  }
}

// Inicialização
async function init() {
  try {
    const [card, cards, currentSubtasksData] = await Promise.all([
      t.card('id', 'name', 'url'),
      t.cards('id', 'name', 'url', 'closed', 'dueComplete'),
      t.get('card', 'shared', 'subtasks_data'),
    ]);

    currentCard = card;
    boardCards = cards || [];

    if (currentSubtasksData && Array.isArray(currentSubtasksData.subtasks)) {
      currentSubtasksData.subtasks.forEach((st) => {
        if (st.cardId) existingSubtaskCardIds.add(st.cardId);
      });
    }

    renderCards();
  } catch (err) {
    console.error('Erro ao carregar cards para o modal:', err);
    cardsContainer.innerHTML = '<div class="empty-state">Erro ao carregar cards.</div>';
  }
}

searchInput.addEventListener('input', (e) => {
  renderCards(e.target.value);
});

t.render(init);
