/* global TrelloPowerUp */

const ICON = './assets/icon.svg';

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

// Calcula métricas de subtarefas considerando cards do quadro
function calculateSubtasksMetrics(subtasksData, boardCardsMap, boardListsMap) {
  if (!subtasksData || !Array.isArray(subtasksData.subtasks) || subtasksData.subtasks.length === 0) {
    return null;
  }
  const total = subtasksData.subtasks.length;

  const completed = subtasksData.subtasks.filter((st) => {
    if (st.completed) return true;
    if (st.cardId && boardCardsMap && boardCardsMap.has(st.cardId)) {
      const cardObj = boardCardsMap.get(st.cardId);
      if (cardObj.dueComplete) return true;
      if (boardListsMap) {
        const listName = boardListsMap.get(cardObj.idList);
        if (isDoneListName(listName)) return true;
      }
    }
    return false;
  }).length;

  const percentage = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percentage,
  };
}

window.TrelloPowerUp.initialize({
  // Badges visíveis na frente do card no quadro
  'card-badges': function (t) {
    return Promise.all([
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
      t.cards('id', 'name', 'idList', 'dueComplete'),
      t.lists('id', 'name'),
    ]).then(([subtasksData, parentData, cards, lists]) => {
      const badges = [];

      const boardCardsMap = new Map();
      if (Array.isArray(cards)) {
        cards.forEach((c) => boardCardsMap.set(c.id, c));
      }

      const boardListsMap = new Map();
      if (Array.isArray(lists)) {
        lists.forEach((l) => boardListsMap.set(l.id, l.name));
      }

      // Badge no card mestre: Progresso de subtasks (ex: 8/15 (53%))
      const metrics = calculateSubtasksMetrics(subtasksData, boardCardsMap, boardListsMap);
      if (metrics) {
        let badgeColor = null;
        if (metrics.percentage === 100) {
          badgeColor = 'green';
        } else if (metrics.percentage > 0) {
          badgeColor = 'blue';
        }

        badges.push({
          icon: ICON,
          text: `${metrics.completed}/${metrics.total} (${metrics.percentage}%)`,
          color: badgeColor,
        });
      }

      // Badge no card filho: Identificador de subtarefa
      if (parentData && parentData.parentId) {
        badges.push({
          text: '↳ Subtarefa',
          color: 'light-gray',
        });
      }

      return badges;
    });
  },

  // Badges detalhados dentro do card aberto (topo do card)
  'card-detail-badges': function (t) {
    return Promise.all([
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
      t.cards('id', 'name', 'idList', 'dueComplete'),
      t.lists('id', 'name'),
    ]).then(([subtasksData, parentData, cards, lists]) => {
      const detailBadges = [];

      const boardCardsMap = new Map();
      if (Array.isArray(cards)) {
        cards.forEach((c) => boardCardsMap.set(c.id, c));
      }

      const boardListsMap = new Map();
      if (Array.isArray(lists)) {
        lists.forEach((l) => boardListsMap.set(l.id, l.name));
      }

      // Detalhe no card mestre
      const metrics = calculateSubtasksMetrics(subtasksData, boardCardsMap, boardListsMap);
      if (metrics) {
        let badgeColor = null;
        if (metrics.percentage === 100) {
          badgeColor = 'green';
        } else if (metrics.percentage > 0) {
          badgeColor = 'blue';
        }

        detailBadges.push({
          title: 'Subtarefas Concluídas',
          text: `${metrics.completed} de ${metrics.total} (${metrics.percentage}%)`,
          color: badgeColor,
        });
      }

      // Detalhe no card filho com link direto ao Pai
      if (parentData && parentData.parentId) {
        detailBadges.push({
          title: 'Card Mestre (Parent)',
          text: parentData.parentTitle ? `↳ ${parentData.parentTitle}` : '↳ Ver Card Mestre',
          color: 'blue',
          callback: function (tContext) {
            return tContext.showCard(parentData.parentId);
          },
        });
      }

      return detailBadges;
    });
  },

  // Seção rica no verso do card
  'card-back-section': function (t) {
    return {
      title: 'Subtarefas & Hierarquia',
      icon: ICON,
      content: {
        type: 'iframe',
        url: t.signUrl('./card-back.html?v=4'),
        height: 340,
      },
    };
  },

  // Botões laterais no card
  'card-buttons': function (t) {
    return [
      {
        icon: ICON,
        text: 'Vincular Subtarefa',
        callback: function (tContext) {
          return tContext.popup({
            title: 'Vincular Subtarefa (Add Subtask)',
            url: './link-modal.html?mode=subtask&v=4',
            height: 360,
          });
        },
      },
      {
        icon: ICON,
        text: 'Definir Tarefa Pai',
        callback: function (tContext) {
          return tContext.popup({
            title: 'Definir Tarefa Pai (Add Parent)',
            url: './link-modal.html?mode=parent&v=4',
            height: 360,
          });
        },
      },
    ];
  },
});
