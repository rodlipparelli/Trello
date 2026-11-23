/* global TrelloPowerUp */

const ICON = './assets/icon.svg';

// Função utilitária para calcular métricas de subtarefas
function calculateSubtasksMetrics(subtasksData) {
  if (!subtasksData || !Array.isArray(subtasksData.subtasks) || subtasksData.subtasks.length === 0) {
    return null;
  }
  const total = subtasksData.subtasks.length;
  const completed = subtasksData.subtasks.filter((st) => st.completed).length;
  const percentage = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percentage,
  };
}

window.TrelloPowerUp.initialize({
  // Badges visíveis na frente do card no quadro (board view)
  'card-badges': function (t) {
    return Promise.all([
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
    ]).then(([subtasksData, parentData]) => {
      const badges = [];

      // Badge no card mestre: Progresso de subtasks (ex: 8/15 - 53%)
      const metrics = calculateSubtasksMetrics(subtasksData);
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

  // Badges detalhados dentro do card aberto (card detail view)
  'card-detail-badges': function (t) {
    return Promise.all([
      t.get('card', 'shared', 'subtasks_data'),
      t.get('card', 'shared', 'subtask_parent'),
    ]).then(([subtasksData, parentData]) => {
      const detailBadges = [];

      // Detalhe no card mestre
      const metrics = calculateSubtasksMetrics(subtasksData);
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

      // Detalhe no card filho
      if (parentData && parentData.parentId) {
        detailBadges.push({
          title: 'Card Mestre',
          text: parentData.parentTitle ? `↳ ${parentData.parentTitle}` : '↳ Ver Card Mestre',
          color: 'blue',
          callback: function (tContext) {
            if (parentData.parentUrl) {
              return tContext.navigate({ url: parentData.parentUrl });
            }
          },
        });
      }

      return detailBadges;
    });
  },

  // Seção rica no verso do card (Card Back Section)
  'card-back-section': function (t) {
    return {
      title: 'Subtarefas & Hierarquia',
      icon: ICON,
      content: {
        type: 'iframe',
        url: t.signUrl('./card-back.html'),
        height: 280,
      },
    };
  },

  // Botão lateral no card
  'card-buttons': function (t) {
    return [
      {
        icon: ICON,
        text: 'Vincular Subtarefa',
        callback: function (tContext) {
          return tContext.popup({
            title: 'Vincular Card como Subtarefa',
            url: './link-modal.html',
            height: 340,
          });
        },
      },
    ];
  },
});
