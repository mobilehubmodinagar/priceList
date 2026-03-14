let data = {};
let isFirebaseReady = false;
let dbRef = null;

const staticBrandMap = {
  iphone: { sectionId: 'iphoneSec', tbodyId: 'iphone' },
  oneplus: { sectionId: 'oneplusSec', tbodyId: 'oneplus' },
  nothing: { sectionId: 'nothingSec', tbodyId: 'nothing' },
  moto: { sectionId: 'motoSec', tbodyId: 'moto' },
  iqoo: { sectionId: 'iqooSec', tbodyId: 'iqoo' },
  'ai+': { sectionId: 'ai+Sec', tbodyId: 'ai+' },
  tecno: { sectionId: 'tecnoSec', tbodyId: 'tecno' },
  poco: { sectionId: 'pocoSec', tbodyId: 'poco' },
  infinix: { sectionId: 'infinixSec', tbodyId: 'infinix' },
  oppo: { sectionId: 'oppoSec', tbodyId: 'oppo' },
  samsung: { sectionId: 'samsungSec', tbodyId: 'samsung' },
  vivo: { sectionId: 'vivoSec', tbodyId: 'vivo' },
  realme: { sectionId: 'realmeSec', tbodyId: 'realme' },
  narzo: { sectionId: 'narzoSec', tbodyId: 'narzo' },
  redmi: { sectionId: 'redmiSec', tbodyId: 'redmi' },
  accessories: { sectionId: 'accessoriesSec', tbodyId: 'accessories' },
  nokia: { sectionId: 'nokiaSec', tbodyId: 'nokia' }
};

const defaultBrandDisplay = {
  iphone: { imageUrl: 'https://1000logos.net/wp-content/uploads/2017/02/iPhone-Logo-2007.png', width: 100, height: 50 },
  oneplus: { imageUrl: 'https://vectorjungal.com/files/preview/1280x410/11722283114xoutmijigzv6mfdtr2mgewmwimzyf98dsupch4lorzvzkskdxmtqaxcttxd1dphrih7glnokllt5zvo4quizhzt7kbuecsc2wlaj.png', width: 100, height: 40 },
  nothing: { imageUrl: 'https://nuraltech.com/wp-content/uploads/2023/05/Nothing-Logo.png', width: 120, height: 25 },
  moto: { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Motorola_new_logo.svg', width: 100, height: 50 },
  iqoo: { imageUrl: 'https://wp.logos-download.com/wp-content/uploads/2024/01/IQOO_Logo.png?dl', width: 80, height: 20 },
  'ai+': { imageUrl: 'https://pbs.twimg.com/profile_images/1933392330763218950/t_7jGLCo_400x400.jpg', width: 40, height: 32 },
  tecno: { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Tecno_Mobile_logo.svg/960px-Tecno_Mobile_logo.svg.png', width: 100, height: 20 },
  poco: { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Poco_Smartphone_Company_logo.svg/960px-Poco_Smartphone_Company_logo.svg.png', width: 90, height: 50 },
  infinix: { imageUrl: 'https://cdn.worldvectorlogo.com/logos/infinix-1.svg', width: 90, height: 30 },
  oppo: { imageUrl: 'https://www.logo.wine/a/logo/Oppo/Oppo-Logo.wine.svg', width: 120, height: 50 },
  samsung: { imageUrl: 'https://1000logos.net/wp-content/uploads/2017/06/Font-Samsung-Logo.jpg', width: 100, height: 70 },
  vivo: { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Vivo_logo_2019.svg/1280px-Vivo_logo_2019.svg.png', width: 100, height: 30 },
  realme: { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Realme_logo.png', width: 100, height: 40 },
  narzo: { imageUrl: 'https://www.punjabnewsexpress.com/images/article/article241735.jpg', width: 100, height: 40 },
  redmi: { imageUrl: 'https://logodix.com/logo/914876.jpg', width: 120, height: 30 },
  nokia: { imageUrl: '', width: null, height: null },
  accessories: { imageUrl: '', width: null, height: null }
};

function normalizePositiveInt(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function ensureBrandHeader(section) {
  const tableWrapper = section.querySelector('.table-wrapper');
  if (!tableWrapper) return null;

  let display = section.querySelector('.brand-display');
  if (!display) {
    display = document.createElement('div');
    display.className = 'brand-display';
    section.insertBefore(display, tableWrapper);
  }

  const legacyHeaders = Array.from(section.children).filter(node => {
    if (node === tableWrapper || node === display) return false;
    return node.classList && (node.classList.contains('brand-name') || node.tagName === 'IMG');
  });
  legacyHeaders.forEach(node => node.remove());

  return display;
}

function renderBrandHeader(brand, section, dayData) {
  const displayEl = ensureBrandHeader(section);
  if (!displayEl) return;

  const metaDisplay = dayData && dayData.__meta && typeof dayData.__meta.brandDisplay === 'object'
    ? dayData.__meta.brandDisplay
    : {};
  const fromMeta = metaDisplay[brand] && typeof metaDisplay[brand] === 'object' ? metaDisplay[brand] : {};
  const fromDefault = defaultBrandDisplay[brand] || {};

  const imageUrl = String(fromMeta.imageUrl || fromDefault.imageUrl || '').trim();
  const width = normalizePositiveInt(fromMeta.width) || normalizePositiveInt(fromDefault.width);
  const height = normalizePositiveInt(fromMeta.height) || normalizePositiveInt(fromDefault.height);

  if (imageUrl) {
    const widthAttr = width ? ` width="${width}"` : '';
    const heightAttr = height ? ` height="${height}"` : '';
    displayEl.innerHTML = `<img class="brand-logo" src="${imageUrl}" alt="${brand}"${widthAttr}${heightAttr}>`;
  } else {
    displayEl.innerHTML = `<div class="brand-name">${brand}</div>`;
  }
}

function toSafeDomId(brand) {
  return `brand_${brand.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
}

function getBrandDomIds(brand) {
  if (staticBrandMap[brand]) return staticBrandMap[brand];
  const safe = toSafeDomId(brand);
  return { sectionId: `${safe}Sec`, tbodyId: safe };
}

function ensureBrandSection(brand) {
  const { sectionId, tbodyId } = getBrandDomIds(brand);
  let section = document.getElementById(sectionId);

  if (!section) {
    section = document.createElement('div');
    section.className = 'brand-section';
    section.id = sectionId;
    section.innerHTML = `
      <div class="brand-display"><div class="brand-name">${brand}</div></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Model</th><th>RAM Storage</th><th>Color</th><th>Price</th><th>Online Price</th><th>Stock Status</th></tr></thead>
          <tbody id="${tbodyId}"></tbody>
        </table>
      </div>
    `;

    const content = document.querySelector('.content');
    content.appendChild(section);
  }

  return { sectionId, tbodyId };
}

function isFirebaseConfigured() {
  if (!window.firebaseConfig) return false;
  const url = window.firebaseConfig.databaseURL || '';
  return Boolean(url) && !url.includes('YOUR_PROJECT_ID');
}

function initFirebase() {
  if (!isFirebaseConfigured() || typeof firebase === 'undefined') {
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const db = firebase.database();
  const dbPath = window.firebaseDatabasePath || 'priceListData';
  dbRef = db.ref(dbPath);
  isFirebaseReady = true;
  return true;
}

async function loadData() {
  if (!isFirebaseReady || !dbRef) {
    data = {};
    return;
  }

  const snapshot = await dbRef.get();
  data = snapshot.exists() ? snapshot.val() : {};
}

/* ================= TIME HELPERS ================= */

function convertTo24Hour(time12h) {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');

  if (hours === '12') {
    hours = '00';
  }

  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }

  return `${hours}:${minutes}`;
}

function getLatestTimeForDate(dateStr) {
  const dateData = data[dateStr];
  if (!dateData) return null;

  const times = Object.keys(dateData).sort((a, b) => {
    return convertTo24Hour(b).localeCompare(convertTo24Hour(a));
  });

  return times[0];
}

/* ================= DROPDOWN ================= */

function populateTimes(dateStr) {
  const timeSelect = document.getElementById('timeInput');
  timeSelect.innerHTML = '<option value="">Latest</option>';

  if (data[dateStr]) {
    const times = Object.keys(data[dateStr]).sort((a, b) => {
      return convertTo24Hour(b).localeCompare(convertTo24Hour(a));
    });

    times.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      timeSelect.appendChild(option);
    });
  }
}

/* ================= TABLE RENDER ================= */

function renderTable(brand, items, dayData) {
  const { sectionId, tbodyId } = ensureBrandSection(brand);
  const tbody = document.getElementById(tbodyId);
  const section = document.getElementById(sectionId);

  renderBrandHeader(brand, section, dayData);

  tbody.innerHTML = '';

  if (!items?.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  items.forEach(item => {
    const stockClass = item.stock === 'In Stock' ? 'in-stock' : 'out-stock';
    const rowClass = item.stock === 'In Stock' ? 'stock-row-in' : 'stock-row-out';
    const stockLabel = item.stock === 'In Stock' ? 'IN' : 'OUT';

    tbody.innerHTML += `
      <tr class="${rowClass}">
        <td>${item.model || ''}</td>
        <td>${item.ram_storage || ''}</td>
        <td>${item.color || ''}</td>
        <td class="price">${item.price?.toLocaleString('en-IN') || '-'}</td>
        <td class="online-price">${item.online_price ? item.online_price.toLocaleString('en-IN') : '-'}</td>
        <td class="stock-cell"><span class="stock-badge ${stockClass}"><span class="stock-word">STOCK</span><span class="stock-state">${stockLabel}</span></span></td>
      </tr>
    `;
  });
}

function arrangeBrandSections(brands) {
  const content = document.querySelector('.content');
  if (!content) return;

  brands.forEach(brand => {
    const { sectionId } = getBrandDomIds(brand);
    const section = document.getElementById(sectionId);
    if (section) {
      // Appending an existing node moves it, enforcing serial-based visual order.
      content.appendChild(section);
    }
  });
}

function getOrderedBrands(dayData, baseBrands) {
  const allKeys = Object.keys(dayData || {}).filter(key => !key.startsWith('__'));
  const baseAndDynamic = Array.from(new Set([...baseBrands, ...allKeys]));

  const metaOrder = Array.isArray(dayData && dayData.__meta && dayData.__meta.brandOrder)
    ? dayData.__meta.brandOrder
    : [];

  const metaSerial = dayData && dayData.__meta && typeof dayData.__meta.brandSerial === 'object'
    ? dayData.__meta.brandSerial
    : {};

  const fallbackList = [
    ...metaOrder.filter(brand => baseAndDynamic.includes(brand)),
    ...baseAndDynamic.filter(brand => !metaOrder.includes(brand))
  ];

  const serialByBrand = {};
  const used = new Set();

  fallbackList.forEach(brand => {
    const serial = Number(metaSerial[brand]);
    if (Number.isInteger(serial) && serial > 0 && !used.has(serial)) {
      serialByBrand[brand] = serial;
      used.add(serial);
    }
  });

  fallbackList.forEach(brand => {
    if (serialByBrand[brand]) return;
    let next = 1;
    while (used.has(next)) {
      next += 1;
    }
    serialByBrand[brand] = next;
    used.add(next);
  });

  const orderIndex = new Map(metaOrder.map((brand, idx) => [brand, idx]));
  const serialOf = brand => serialByBrand[brand] || null;

  return baseAndDynamic.slice().sort((a, b) => {
    const aSerial = serialOf(a);
    const bSerial = serialOf(b);

    if (aSerial !== null && bSerial !== null) {
      if (aSerial !== bSerial) return aSerial - bSerial;
    } else if (aSerial !== null) {
      return -1;
    } else if (bSerial !== null) {
      return 1;
    }

    const aIdx = orderIndex.has(a) ? orderIndex.get(a) : Number.MAX_SAFE_INTEGER;
    const bIdx = orderIndex.has(b) ? orderIndex.get(b) : Number.MAX_SAFE_INTEGER;
    if (aIdx !== bIdx) return aIdx - bIdx;

    return a.localeCompare(b);
  });
}

function refreshSectionAnimation() {
  const sections = Array.from(document.querySelectorAll('.brand-section')).filter(section => {
    return section.style.display !== 'none';
  });

  sections.forEach((section, index) => {
    const delay = Math.min(index * 65, 780);
    section.style.setProperty('--stagger', `${delay}ms`);

    // Re-trigger section animation for each render cycle.
    section.style.animation = 'none';
    section.offsetHeight;
    section.style.animation = '';
  });
}

/* ================= MAIN UPDATE ================= */
function getLatestAvailableDate(targetDate) {
  const availableDates = Object.keys(data).sort().reverse(); // Sort dates descending
  // Find the first date that is less than or equal to our targetDate
  return availableDates.find(date => date <= targetDate) || null;
}

/* ================= UPDATED MAIN UPDATE ================= */

async function updateDisplay(loadFresh = false) {
  if (loadFresh) {
    await loadData();
  }

  const dateInput = document.getElementById('dateInput');
  const timeInput = document.getElementById('timeInput');
  
  let dateStr = dateInput.value;
  let timeStr = timeInput.value;

  if (!dateStr) return;

  // 1. FALLBACK LOGIC: If no data for selected date, find the previous available one
  if (!data[dateStr]) {
    const fallbackDate = getLatestAvailableDate(dateStr);
    
    if (fallbackDate) {
      // Update the UI input value to the previous date
      dateInput.value = fallbackDate;
      dateStr = fallbackDate;
      
      // Since date changed, we must refresh the "Time" dropdown options
      populateTimes(dateStr);
      
      // Reset the time selection to "Latest" for the new date
      timeInput.value = "";
      timeStr = ""; 
    }
  }

  document.getElementById('dateDisplay').textContent = dateStr;

  let dayData = null;
  let displayTime = 'Latest';

  // 2. DATA SELECTION
  if (timeStr) {
    dayData = data[dateStr]?.[timeStr];
    displayTime = timeStr;
  } else {
    const latestTime = getLatestTimeForDate(dateStr);
    dayData = latestTime ? data[dateStr][latestTime] : null;
    displayTime = latestTime || 'No Data';
  }

  // 3. UI RENDERING
  document.getElementById('dateStatus').textContent = displayTime;
  document.getElementById('dateStatus').className = 'date-status date-available';

  if (dayData) {
    document.getElementById('pageNotFound').style.display = 'none';

    // Reset all sections first so stale dynamic brands do not leak across dates.
    document.querySelectorAll('.brand-section').forEach(section => {
      section.style.display = 'none';
    });

    const baseBrands = [
      'iphone', 'oneplus', 'nothing', 'moto', 'iqoo', 'ai+', 'tecno', 
      'poco', 'infinix', 'oppo', 'samsung', 'vivo', 'realme', 
      'narzo', 'redmi', 'accessories', 'nokia'
    ];
    const brands = getOrderedBrands(dayData, baseBrands);
    arrangeBrandSections(brands);
    brands.forEach(brand => renderTable(brand, dayData[brand] || [], dayData));
    refreshSectionAnimation();
    
  } else {
    document.getElementById('dateStatus').className = 'date-status date-not-found';
    document.getElementById('pageNotFound').style.display = 'block';
    document.querySelectorAll('.brand-section').forEach(s => s.style.display = 'none');
  }
}

/* ================= REALTIME LISTENER ================= */

function subscribeRealtimeUpdates() {
  if (!isFirebaseReady || !dbRef) return;

  dbRef.on('value', snapshot => {
    data = snapshot.exists() ? snapshot.val() : {};
    updateDisplay(false);
    console.log('Realtime data synced from Firebase');
  }, err => {
    console.error('Realtime listener error:', err);
  });
}

/* ================= HARD RELOAD EVENTS ================= */

// Reload when tab becomes active
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateDisplay(false);
  }
});

// Manual reload (Ctrl + R without page refresh)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    updateDisplay(true);
    console.log('🔄 Manual hard reload');
  }
});

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', async () => {
  const dateInput = document.getElementById('dateInput');
  const timeInput = document.getElementById('timeInput');
  const resetBtn = document.getElementById('resetDateBtn');

  if (!initFirebase()) {
    document.getElementById('dateStatus').textContent = 'Firebase not configured';
    document.getElementById('dateStatus').className = 'date-status date-not-found';
    document.getElementById('pageNotFound').style.display = 'block';
    document.querySelector('#pageNotFound h2').textContent = 'Configuration Required';
    document.querySelector('#pageNotFound p').textContent = 'Set your Firebase details in firebase-config.js';
    document.querySelectorAll('.brand-section').forEach(s => s.style.display = 'none');
    return;
  }

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];

  dateInput.value = today;

  dateInput.onchange = () => {
    timeInput.value = '';
    populateTimes(dateInput.value);
    updateDisplay(false);
  };

  timeInput.onchange = () => updateDisplay(false);

  resetBtn.onclick = () => {
    dateInput.value = today;
    timeInput.value = '';
    populateTimes(today);
    updateDisplay(true);
  };

  await loadData();
  populateTimes(today);
  updateDisplay(false);

  subscribeRealtimeUpdates();
});
