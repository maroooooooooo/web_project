/* ── dashboard.js ── */

// ── DATA (mocked — replace with API calls to PHP backend) ──────────────
const API_BASE = 'https://51.20.156.70/php/api.php';
const LOGIN_PAGE = 'login.html';
const MOCK_ORDERS = [
  { id:'#1042', customer:'Sarah K.',   product:'Pro Plan',    amount:'$129', status:'completed' },
  { id:'#1041', customer:'James O.',   product:'Basic Plan',  amount:'$49',  status:'pending'   },
  { id:'#1040', customer:'Mia R.',     product:'Enterprise',  amount:'$499', status:'shipped'   },
  { id:'#1039', customer:'Leo T.',     product:'Pro Plan',    amount:'$129', status:'completed' },
  { id:'#1038', customer:'Ava S.',     product:'Basic Plan',  amount:'$49',  status:'cancelled' },
];

const MOCK_PRODUCTS = [
  { name:'Enterprise Plan', sales:'241 sales', revenue:'$30.1k', icon:'🏢' },
  { name:'Pro Plan',        sales:'528 sales', revenue:'$18.4k', icon:'⚡' },
  { name:'Basic Plan',      sales:'894 sales', revenue:'$9.2k',  icon:'🌱' },
  { name:'Add-ons Bundle',  sales:'113 sales', revenue:'$4.7k',  icon:'🔌' },
];

const WEEKLY_DATA  = [12400,18200,14700,22100,19800,27400,24100];
const MONTHLY_DATA = [54000,61000,48000,73000,82000,67000,91000,78000,85000,94000,88000,102000];
const LABELS_W = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const LABELS_M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── FETCH HELPER ───────────────────────────────────────────────────────
async function fetchData(endpoint) {
  try {
    const res = await fetch(`${API_BASE}?action=${endpoint}`, {
      credentials: 'include'
    });
    if (res.status === 401) {
      window.location.href = LOGIN_PAGE;
      return null;
    }
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    // Backend unavailable → return mock data silently
    return null;
  }
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

// ── RENDER ORDERS ──────────────────────────────────────────────────────
async function renderOrders() {
  const data = await fetchData('orders');
  const orders = data?.orders ?? MOCK_ORDERS;
  const tbody = document.getElementById('ordersBody');
  if (!tbody) return;
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.customer}</td>
      <td>${o.product}</td>
      <td><strong>${o.amount}</strong></td>
      <td><span class="status-badge status-${o.status}">${capitalize(o.status)}</span></td>
    </tr>
  `).join('');
}

// ── RENDER PRODUCTS ────────────────────────────────────────────────────
async function renderProducts() {
  const data = await fetchData('products');
  const products = data?.products ?? MOCK_PRODUCTS;
  const list = document.getElementById('productsList');
  if (!list) return;
  list.innerHTML = products.map(p => `
    <div class="product-item">
      <div class="product-icon">${p.icon}</div>
      <div>
        <p class="product-name">${p.name}</p>
        <p class="product-sales">${p.sales}</p>
      </div>
      <span class="product-revenue">${p.revenue}</span>
    </div>
  `).join('');
}

// ── KPI COUNTER ANIMATION ──────────────────────────────────────────────
function animateCounters() {
  document.querySelectorAll('.kpi-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const prefix = el.textContent.startsWith('$') ? '$' : '';
    let start = 0;
    const duration = 1200;
    const step = (timestamp, startTime) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * target);
      el.textContent = prefix + current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(ts => step(ts, startTime));
    };
    requestAnimationFrame(ts => step(ts, ts));
  });
}

// ── REVENUE CHART ──────────────────────────────────────────────────────
let revenueChart;

function buildRevenueChart(period = 'weekly') {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;

  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const textColor = isDark ? '#7b8294' : '#9ca3af';
  const labels = period === 'weekly' ? LABELS_W : LABELS_M;
  const values = period === 'weekly' ? WEEKLY_DATA : MONTHLY_DATA;

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(99,102,241,.18)');
  gradient.addColorStop(1, 'rgba(99,102,241,0)');

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        borderColor: '#6366f1',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true,
        tension: .42,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1a1d27' : '#1a1d23',
          titleColor: '#9ca3af',
          bodyColor: '#fff',
          padding: 10,
          callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString()}` }
        }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)
          }
        }
      }
    }
  });
}

// ── DONUT CHART ────────────────────────────────────────────────────────
function buildDonutChart() {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;

  const sources = [
    { label: 'Organic Search', value: 42, color: '#6366f1' },
    { label: 'Social Media',   value: 28, color: '#10b981' },
    { label: 'Direct',         value: 18, color: '#f59e0b' },
    { label: 'Referral',       value: 12, color: '#ef4444' },
  ];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sources.map(s => s.label),
      datasets: [{
        data: sources.map(s => s.value),
        backgroundColor: sources.map(s => s.color),
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed}%` } } },
    }
  });

  const legend = document.getElementById('donutLegend');
  if (legend) {
    legend.innerHTML = sources.map(s => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${s.color}"></span>
        <span class="legend-label">${s.label}</span>
        <span class="legend-value">${s.value}%</span>
      </div>
    `).join('');
  }
}

// ── CHART PERIOD TABS ──────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    buildRevenueChart(tab.dataset.period);
  });
});

// ── SIDEBAR TOGGLE (mobile) ────────────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const menuBtn  = document.getElementById('menuToggle');
let overlay;

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', closeSidebar);
}

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (menuBtn) {
  createOverlay();
  menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
}

// ── DARK MODE ──────────────────────────────────────────────────────────
const themeBtn = document.getElementById('themeToggle');

function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  if (themeBtn) themeBtn.textContent = dark ? '🌙' : '☀️';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  // Rebuild charts with correct colors
  if (revenueChart) {
    const activePeriod = document.querySelector('.tab.active')?.dataset.period || 'weekly';
    buildRevenueChart(activePeriod);
  }
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    applyTheme(!document.body.classList.contains('dark'));
  });
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') applyTheme(true);

// ── NOTIFICATION DROPDOWN ──────────────────────────────────────────────
const notifBtn      = document.getElementById('notifBtn');
const notifDropdown = document.getElementById('notifDropdown');

if (notifBtn && notifDropdown) {
  notifBtn.addEventListener('click', e => {
    e.stopPropagation();
    notifDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => notifDropdown.classList.remove('open'));
}

// ── TOAST ──────────────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

window.showToast = showToast;

// ── SEARCH ────────────────────────────────────────────────────────────
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      showToast(`Searching for "${searchInput.value}"…`);
      searchInput.value = '';
    }
  });
}

// ── INIT ──────────────────────────────────────────────────────────────
(async () => {
  animateCounters();
  await renderOrders();
  await renderProducts();
  buildRevenueChart();
  buildDonutChart();
})();
