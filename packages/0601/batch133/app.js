/**
 * localStorage 存储结构（供后续后端同步参考）
 *
 * Key: plant_water_reminder_plants
 * Value: Plant[] JSON 数组
 *
 * Plant Schema:
 * {
 *   id: number;           // 自增主键，由 plant_id_counter 维护
 *   name: string;         // 植物名称，用户输入
 *   room: '客厅' | '阳台' | '卧室';  // 所在房间
 *   lastWatered: string;  // 上次浇水日期，格式 YYYY-MM-DD
 *   waterCycle: number;   // 浇水周期（天），≥ 1
 *   createdAt: string;    // 创建时间 ISO 8601，如 "2026-06-02T08:00:00.000Z"
 * }
 *
 * 其他 Key:
 * - plant_id_counter: number       // 下一个植物 ID，用于保证 ID 唯一性
 * - plant_notified_dates: string[] // 已通知记录，格式 ["{plantId}-{date}"]，防重复推送
 *
 * 后端同步建议：
 * - lastWatered / waterCycle 变更时触发增量同步
 * - 以服务端时间为准，避免客户端时钟漂移影响
 * - room 字段可用枚举类型存储
 */

/**
 * Notification API 浏览器兼容性说明
 *
 * ✅ Chrome / Firefox / Edge (桌面)：完整支持，HTTPS 下可持久授权
 * ⚠️ iOS Safari 限制：
 *   - 必须由用户手势触发 requestPermission（不能自动弹窗）
 *   - PWA 添加到主屏幕后才支持持久化通知
 *   - 通知点击回调支持有限，建议仅用做提醒，不承载深层操作
 *   - iOS 16.4+ 才支持 Web Push 后台推送，此前仅页面打开时能触发
 * 🚫 部分安卓浏览器可能被系统电池优化拦截
 *
 * 当前策略：页面打开时每小时检查一次，当日同株植物只推一次
 */

const STORAGE_KEY = 'plant_water_reminder_plants';
const ID_COUNTER_KEY = 'plant_id_counter';
const NOTIFIED_KEY = 'plant_notified_dates';

let plants = [];
let pendingDeleteId = null;
let currentRoom = 'all';

const plantForm = document.getElementById('plantForm');
const plantsContainer = document.getElementById('plantsContainer');
const emptyState = document.getElementById('emptyState');
const lastWateredInput = document.getElementById('lastWatered');
const confirmModal = document.getElementById('confirmModal');
const confirmText = document.getElementById('confirmText');
const confirmOk = document.getElementById('confirmOk');
const confirmCancel = document.getElementById('confirmCancel');
const roomFilter = document.getElementById('roomFilter');
const notifBanner = document.getElementById('notifBanner');
const notifEnableBtn = document.getElementById('notifEnableBtn');
const notifDismissBtn = document.getElementById('notifDismissBtn');
const notifDeniedBanner = document.getElementById('notifDeniedBanner');
const notifDeniedDismissBtn = document.getElementById('notifDeniedDismissBtn');

lastWateredInput.value = formatDate(new Date());

loadPlants();
initNotificationUI();
renderPlants();
startNotificationCheck();

plantForm.addEventListener('submit', function(e) {
  e.preventDefault();

  const name = document.getElementById('plantName').value.trim();
  const room = document.getElementById('plantRoom').value;
  const lastWatered = document.getElementById('lastWatered').value;
  const waterCycle = parseInt(document.getElementById('waterCycle').value);

  if (!name || !lastWatered || isNaN(waterCycle) || waterCycle < 1) {
    return;
  }

  const plant = {
    id: nextId(),
    name,
    room,
    lastWatered,
    waterCycle,
    createdAt: new Date().toISOString()
  };

  plants.push(plant);
  savePlants();
  renderPlants();
  plantForm.reset();
  lastWateredInput.value = formatDate(new Date());
  document.getElementById('plantRoom').value = '客厅';
});

roomFilter.addEventListener('click', function(e) {
  const btn = e.target.closest('.room-filter-btn');
  if (!btn) return;

  roomFilter.querySelectorAll('.room-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentRoom = btn.dataset.room;
  renderPlants();
});

plantsContainer.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const card = btn.closest('.plant-card');
  if (!card) return;

  const plantId = Number(card.dataset.id);

  if (btn.classList.contains('btn-water')) {
    waterPlant(plantId);
  } else if (btn.classList.contains('btn-delete')) {
    if (pendingDeleteId !== null) return;
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;
    showDeleteConfirm(plantId, plant.name);
  } else if (btn.classList.contains('btn-edit-cycle')) {
    startEditCycle(card, plantId);
  } else if (btn.classList.contains('btn-save-cycle')) {
    saveEditCycle(card, plantId);
  } else if (btn.classList.contains('btn-cancel-cycle')) {
    renderPlants();
  }
});

plantsContainer.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.classList.contains('edit-cycle-input')) {
    const card = e.target.closest('.plant-card');
    if (!card) return;
    const plantId = Number(card.dataset.id);
    saveEditCycle(card, plantId);
  }
  if (e.key === 'Escape' && e.target.classList.contains('edit-cycle-input')) {
    renderPlants();
  }
});

confirmOk.addEventListener('click', function() {
  if (pendingDeleteId !== null) {
    plants = plants.filter(p => p.id !== pendingDeleteId);
    savePlants();
    renderPlants();
  }
  closeDeleteConfirm();
});

confirmCancel.addEventListener('click', closeDeleteConfirm);

confirmModal.addEventListener('click', function(e) {
  if (e.target === confirmModal) {
    closeDeleteConfirm();
  }
});

notifEnableBtn.addEventListener('click', async function() {
  const result = await Notification.requestPermission();
  updateNotifBanner(result);
});

notifDismissBtn.addEventListener('click', function() {
  notifBanner.classList.add('hidden');
});

notifDeniedDismissBtn.addEventListener('click', function() {
  notifDeniedBanner.classList.add('hidden');
});

function initNotificationUI() {
  if (!('Notification' in window)) return;
  updateNotifBanner(Notification.permission);
}

function updateNotifBanner(permission) {
  notifBanner.classList.add('hidden');
  notifDeniedBanner.classList.add('hidden');

  if (permission === 'default') {
    notifBanner.classList.remove('hidden');
  } else if (permission === 'denied') {
    notifDeniedBanner.classList.remove('hidden');
  }
}

function startNotificationCheck() {
  checkAndNotify();
  setInterval(checkAndNotify, 60 * 60 * 1000);
}

function checkAndNotify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = formatDate(new Date());
  const notified = getNotifiedSet();

  plants.forEach(plant => {
    const days = calculateDaysRemaining(plant);
    const key = `${plant.id}-${today}`;

    if (days <= 0 && !notified.has(key)) {
      const title = days < 0 ? `🚨 ${plant.name} 已逾期浇水` : `💧 ${plant.name} 今天需要浇水`;
      const body = days < 0
        ? `${plant.name}（${plant.room}）已逾期 ${Math.abs(days)} 天未浇水，快去照顾它吧！`
        : `${plant.name}（${plant.room}）今天该浇水了！`;

      try {
        new Notification(title, { body, icon: '🌱' });
      } catch (e) {}
      notified.add(key);
    }
  });

  saveNotifiedSet(notified);
}

function getNotifiedSet() {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveNotifiedSet(set) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
}

function nextId() {
  let counter = parseInt(localStorage.getItem(ID_COUNTER_KEY)) || 0;
  counter++;
  localStorage.setItem(ID_COUNTER_KEY, String(counter));
  return counter;
}

function loadPlants() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      plants = JSON.parse(stored);
    } catch (e) {
      plants = [];
    }
  }
  plants.forEach(p => {
    if (!p.room) p.room = '客厅';
  });
}

function savePlants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

function calculateDaysRemaining(plant) {
  const lastWateredDate = new Date(plant.lastWatered);
  const today = new Date();
  lastWateredDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysSinceWatered = Math.floor((today - lastWateredDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = plant.waterCycle - daysSinceWatered;

  return daysRemaining;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getCardStatus(daysRemaining) {
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 2) return 'urgent';
  return 'normal';
}

function startEditCycle(card, plantId) {
  const plant = plants.find(p => p.id === plantId);
  if (!plant) return;

  const cycleEl = card.querySelector('.cycle-value');
  if (!cycleEl) return;

  const currentCycle = plant.waterCycle;
  cycleEl.innerHTML = `
    <input type="number" class="edit-cycle-input" value="${currentCycle}" min="1" style="width:60px;padding:4px 8px;border:2px solid #66bb6a;border-radius:4px;font-size:0.9rem;">
    <button class="btn-save-cycle" style="padding:4px 10px;background:#66bb6a;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem;margin-left:4px;">保存</button>
    <button class="btn-cancel-cycle" style="padding:4px 10px;background:#bbb;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem;margin-left:4px;">取消</button>
  `;

  const input = cycleEl.querySelector('.edit-cycle-input');
  input.focus();
  input.select();
}

function saveEditCycle(card, plantId) {
  const input = card.querySelector('.edit-cycle-input');
  if (!input) return;

  const newCycle = parseInt(input.value);
  if (isNaN(newCycle) || newCycle < 1) {
    input.style.borderColor = '#e53935';
    return;
  }

  const plant = plants.find(p => p.id === plantId);
  if (plant) {
    plant.waterCycle = newCycle;
    savePlants();
    renderPlants();
  }
}

function showDeleteConfirm(plantId, plantName) {
  pendingDeleteId = plantId;
  confirmText.textContent = `确定要删除「${plantName}」吗？此操作不可撤销。`;
  confirmModal.classList.add('active');
  confirmOk.focus();
}

function closeDeleteConfirm() {
  pendingDeleteId = null;
  confirmModal.classList.remove('active');
}

function renderPlants() {
  let filtered = currentRoom === 'all' ? plants : plants.filter(p => p.room === currentRoom);

  if (filtered.length === 0) {
    plantsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    if (plants.length > 0 && currentRoom !== 'all') {
      emptyState.querySelector('p:first-child').textContent = `${currentRoom}还没有植物 🌿`;
      emptyState.querySelector('.hint').textContent = '换个房间看看，或添加一株新植物吧！';
    } else {
      emptyState.querySelector('p:first-child').textContent = '还没有添加任何植物 🌿';
      emptyState.querySelector('.hint').textContent = '在上方表单中添加你的第一株植物吧！';
    }
    return;
  }

  emptyState.classList.add('hidden');

  const sortedPlants = [...filtered].sort((a, b) => {
    return calculateDaysRemaining(a) - calculateDaysRemaining(b);
  });

  plantsContainer.innerHTML = sortedPlants.map(plant => {
    const daysRemaining = calculateDaysRemaining(plant);
    const status = getCardStatus(daysRemaining);

    let statusClass = '';
    let statusBadge = '';
    let daysText = '';

    if (status === 'overdue') {
      statusClass = 'overdue';
      statusBadge = '<span class="overdue-badge">已逾期</span>';
      daysText = `逾期 ${Math.abs(daysRemaining)} 天`;
    } else if (daysRemaining === 0) {
      statusClass = 'urgent';
      daysText = '今天需要浇水';
    } else if (daysRemaining === 1) {
      statusClass = 'urgent';
      daysText = '明天需要浇水';
    } else {
      daysText = `还有 ${daysRemaining} 天`;
      if (status === 'urgent') {
        statusClass = 'urgent';
      }
    }

    const roomEmoji = plant.room === '客厅' ? '🏠' : plant.room === '阳台' ? '☀️' : '🛏️';

    return `
      <div class="plant-card ${statusClass}" data-id="${plant.id}">
        ${statusBadge}
        <div class="plant-name">${escapeHtml(plant.name)}</div>
        <div class="plant-info"><span class="room-tag">${roomEmoji} ${escapeHtml(plant.room)}</span></div>
        <div class="plant-info">上次浇水：${formatDisplayDate(plant.lastWatered)}</div>
        <div class="plant-info cycle-value">浇水周期：每 ${plant.waterCycle} 天 <button class="btn-edit-cycle" title="修改周期">✏️</button></div>
        <div class="days-remaining">
          <div class="days-label">距下次浇水</div>
          <div class="days-count">${daysText}</div>
        </div>
        <div class="card-actions">
          <button class="btn-water">💧 已浇水</button>
          <button class="btn-delete">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function waterPlant(id) {
  const plant = plants.find(p => p.id === id);
  if (plant) {
    plant.lastWatered = formatDate(new Date());
    savePlants();
    renderPlants();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
