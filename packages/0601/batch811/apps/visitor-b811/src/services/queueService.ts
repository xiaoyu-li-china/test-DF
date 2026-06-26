const STORAGE_KEY = 'visitor_queue_counter';
const PREFIX = 'V';

export const generateQueueNumber = (): string => {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(STORAGE_KEY);
  let counter = 1;
  let dateStored = today;

  if (stored) {
    const parsed = JSON.parse(stored);
    dateStored = parsed.date;
    if (dateStored === today) {
      counter = parsed.counter + 1;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    date: today,
    counter
  }));

  const numberStr = counter.toString().padStart(3, '0');
  return `${PREFIX}${numberStr}`;
};

export const getCurrentCounter = (): number => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    return parsed.counter || 0;
  }
  return 0;
};

export const resetCounter = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
