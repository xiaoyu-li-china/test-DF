(function(root) {
  function calculateDaysRemaining(plant, today = new Date()) {
    const lastWateredDate = new Date(plant.lastWatered);
    lastWateredDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const daysSinceWatered = Math.floor((today - lastWateredDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = plant.waterCycle - daysSinceWatered;

    return daysRemaining;
  }

  function getCardStatus(daysRemaining) {
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining <= 2) return 'urgent';
    return 'normal';
  }

  function isOverdue(plant, today = new Date()) {
    return calculateDaysRemaining(plant, today) < 0;
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const utils = {
    calculateDaysRemaining,
    getCardStatus,
    isOverdue,
    formatDate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
  } else {
    root.calculateDaysRemaining = calculateDaysRemaining;
    root.getCardStatus = getCardStatus;
    root.isOverdue = isOverdue;
    root.formatDate = formatDate;
  }
})(typeof window !== 'undefined' ? window : global);
