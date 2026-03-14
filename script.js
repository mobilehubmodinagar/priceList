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
      <div class="brand-name">${brand}</div>
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

function renderTable(brand, items) {
  const { sectionId, tbodyId } = ensureBrandSection(brand);
  const tbody = document.getElementById(tbodyId);
  const section = document.getElementById(sectionId);

  tbody.innerHTML = '';

  if (!items?.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  items.forEach(item => {
    const stockClass = item.stock === 'In Stock' ? 'in-stock' : 'out-stock';

    tbody.innerHTML += `
      <tr>
        <td>${item.model || ''}</td>
        <td>${item.ram_storage || ''}</td>
        <td>${item.color || ''}</td>
        <td class="price">${item.price?.toLocaleString('en-IN') || '-'}</td>
        <td class="online-price">${item.online_price ? item.online_price.toLocaleString('en-IN') : '-'}</td>
        <td><span class="stock-badge ${stockClass}">${item.stock || ''}</span></td>
      </tr>
    `;
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

    const baseBrands = [
      'iphone', 'oneplus', 'nothing', 'moto', 'iqoo', 'ai+', 'tecno', 
      'poco', 'infinix', 'oppo', 'samsung', 'vivo', 'realme', 
      'narzo', 'redmi', 'accessories', 'nokia'
    ];
    const brands = Array.from(new Set([...baseBrands, ...Object.keys(dayData)]));
    brands.forEach(brand => renderTable(brand, dayData[brand] || []));
    
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
