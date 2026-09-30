let data = {};
let isFirebaseReady = false;
let dbRef = null;
let headerRef = null;

let currentSearchQuery = '';
let currentBrandFilter = '';
let currentStockFilter = '';
let searchDebounceTimer = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const defaultHeaderContact = {
  storeTitle: 'Mobile Hub',
  tagline: 'Live Retail Dashboard',
  primaryName: 'Ayush Jindal',
  primaryNumber: '8439588304',
  address: 'Mobile market, Adarsh Nagar, Modinagar',
  staffContacts: [
    { name: 'Abhishek', number: '7417828942' },
    { name: 'Shrikant', number: '9560519459' },
    { name: 'Aasif', number: '9045266461' }
  ]
};

function renderHeaderContact(contactData) {
  const info = contactData || defaultHeaderContact;
  const storeTitle = info.storeTitle || defaultHeaderContact.storeTitle;
  const tagline = info.tagline || defaultHeaderContact.tagline;
  const primaryName = info.primaryName || defaultHeaderContact.primaryName;
  const primaryNumber = info.primaryNumber || defaultHeaderContact.primaryNumber;
  const address = info.address || defaultHeaderContact.address;
  const staff = Array.isArray(info.staffContacts) ? info.staffContacts : defaultHeaderContact.staffContacts;

  const taglineEl = document.getElementById('headerTagline');
  if (taglineEl) taglineEl.textContent = tagline;

  const storeTitleEl = document.getElementById('headerStoreTitle');
  if (storeTitleEl) storeTitleEl.textContent = storeTitle;

  const primaryContactEl = document.getElementById('headerPrimaryContact');
  if (primaryContactEl) {
    if (primaryNumber && primaryName) {
      primaryContactEl.innerHTML = `Mobile: <a href="tel:${escapeHtml(primaryNumber)}" class="contact-link">${escapeHtml(primaryNumber)}</a> | <span>${escapeHtml(primaryName)}</span>`;
    } else if (primaryNumber) {
      primaryContactEl.innerHTML = `Mobile: <a href="tel:${escapeHtml(primaryNumber)}" class="contact-link">${escapeHtml(primaryNumber)}</a>`;
    } else if (primaryName) {
      primaryContactEl.textContent = primaryName;
    } else {
      primaryContactEl.textContent = '';
    }
  }

  const addressEl = document.getElementById('headerAddress');
  if (addressEl) addressEl.textContent = address || '';

  const staffEl = document.getElementById('headerStaffContacts');
  if (staffEl) {
    if (staff && staff.length > 0) {
      const parts = staff
        .filter(s => s && (s.name || s.number))
        .map(s => {
          const name = s.name ? escapeHtml(s.name) : '';
          const num = s.number ? `<a href="tel:${escapeHtml(s.number)}" class="contact-link">${escapeHtml(s.number)}</a>` : '';
          if (name && num) return `${name}- ${num}`;
          return name || num;
        });
      if (parts.length > 0) {
        staffEl.innerHTML = `(${parts.join(', ')})`;
        staffEl.style.display = '';
      } else {
        staffEl.style.display = 'none';
      }
    } else {
      staffEl.style.display = 'none';
    }
  }
}

function subscribeHeaderContact() {
  if (!isFirebaseReady) return;
  const headerPath = window.firebaseHeaderPath || 'headerContact';
  headerRef = firebase.database().ref(headerPath);
  headerRef.on('value', snapshot => {
    const val = snapshot.exists() ? snapshot.val() : null;
    renderHeaderContact(val);
  }, err => {
    console.error('Header contact listener error:', err);
    renderHeaderContact(null);
  });
}

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

  items.forEach((item, index) => {
    const stockClass = item.stock === 'In Stock' ? 'in-stock' : 'out-stock';
    const rowClass = item.stock === 'In Stock' ? 'stock-row-in' : 'stock-row-out';
    const stockLabel = item.stock === 'In Stock' ? 'IN' : 'OUT';
    const safeBrand = String(brand).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const rowId = `row_${safeBrand}_${index}`;

    tbody.innerHTML += `
      <tr class="${rowClass}" id="${rowId}"
          data-brand="${escapeHtml(brand)}"
          data-model="${escapeHtml(item.model || '')}"
          data-spec="${escapeHtml(item.ram_storage || '')}"
          data-color="${escapeHtml(item.color || '')}"
          data-price="${item.price !== null && item.price !== undefined ? item.price : ''}"
          data-online="${item.online_price !== null && item.online_price !== undefined ? item.online_price : ''}"
          data-stock="${escapeHtml(item.stock || 'In Stock')}">
        <td class="cell-model">${escapeHtml(item.model || '')}</td>
        <td class="cell-spec">${escapeHtml(item.ram_storage || '')}</td>
        <td class="cell-color">${escapeHtml(item.color || '')}</td>
        <td class="price">${item.price !== null && item.price !== undefined && item.price !== '' ? Number(item.price).toLocaleString('en-IN') : '-'}</td>
        <td class="online-price">${item.online_price ? Number(item.online_price).toLocaleString('en-IN') : '-'}</td>
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
    updateBrandMenuAndChips(brands);
    applySearchFilter();
    
  } else {
    document.getElementById('dateStatus').className = 'date-status date-not-found';
    document.getElementById('pageNotFound').style.display = 'block';
    document.querySelectorAll('.brand-section').forEach(s => s.style.display = 'none');
    const noResultsEl = document.getElementById('searchNoResults');
    if (noResultsEl) noResultsEl.style.display = 'none';
  }
}

/* ================= SEARCH & FILTER MENU ================= */

function highlightSearchMatch(text, query) {
  const safeText = escapeHtml(text || '');
  if (!query) return safeText;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function updateBrandMenuAndChips(brands) {
  const brandSelect = document.getElementById('brandFilterSelect');
  const chipsMenu = document.getElementById('brandChipsMenu');

  if (brandSelect) {
    const prevVal = brandSelect.value;
    brandSelect.innerHTML = `<option value="">All Brands (${brands.length})</option>`;
    brands.forEach(brand => {
      const opt = document.createElement('option');
      opt.value = brand;
      opt.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
      brandSelect.appendChild(opt);
    });
    brandSelect.value = prevVal;
  }

  if (chipsMenu) {
    chipsMenu.innerHTML = '';

    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = `brand-chip ${currentBrandFilter === '' ? 'active' : ''}`;
    allChip.dataset.brand = '';
    allChip.textContent = 'All Brands';
    allChip.addEventListener('click', () => {
      currentBrandFilter = '';
      if (brandSelect) brandSelect.value = '';
      updateActiveBrandChip('');
      applySearchFilter();
    });
    chipsMenu.appendChild(allChip);

    brands.forEach(brand => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `brand-chip ${currentBrandFilter.toLowerCase() === brand.toLowerCase() ? 'active' : ''}`;
      chip.dataset.brand = brand;
      chip.textContent = brand;
      chip.addEventListener('click', () => {
        currentBrandFilter = brand;
        if (brandSelect) brandSelect.value = brand;
        updateActiveBrandChip(brand);
        applySearchFilter();
      });
      chipsMenu.appendChild(chip);
    });
  }
}

function updateActiveBrandChip(brand) {
  const chips = document.querySelectorAll('.brand-chip');
  chips.forEach(chip => {
    const targetBrand = (chip.dataset.brand || '').toLowerCase();
    chip.classList.toggle('active', targetBrand === (brand || '').toLowerCase());
  });
}

function renderSearchDropdown(query, items) {
  const dropdownMenu = document.getElementById('searchDropdownMenu');
  const dropdownList = document.getElementById('searchDropdownList');
  if (!dropdownMenu || !dropdownList) return;

  if (!query || items.length === 0) {
    dropdownMenu.style.display = 'none';
    dropdownList.innerHTML = '';
    return;
  }

  dropdownList.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'search-dropdown-item';
    const stockClass = item.stock === 'In Stock' ? 'in-stock' : 'out-stock';
    const stockText = item.stock === 'In Stock' ? 'IN' : 'OUT';

    div.innerHTML = `
      <div class="search-dropdown-main">
        <div class="search-dropdown-model">${highlightSearchMatch(item.model, query)}</div>
        <div class="search-dropdown-sub">
          <span class="search-dropdown-brand-tag">${escapeHtml(item.brand)}</span>
          ${item.spec ? `<span>${escapeHtml(item.spec)}</span>` : ''}
          ${item.color ? `<span>• ${escapeHtml(item.color)}</span>` : ''}
        </div>
      </div>
      <div class="search-dropdown-right">
        <div class="search-dropdown-price">${item.price ? `₹${item.price}` : '-'}</div>
        <span class="stock-badge ${stockClass}" style="padding: 2px 7px; font-size: 0.65rem;">
          <span class="stock-state" style="font-size: 0.62rem;">${stockText}</span>
        </span>
      </div>
    `;

    div.addEventListener('click', () => {
      dropdownMenu.style.display = 'none';
      const targetRow = document.getElementById(item.rowId);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetRow.classList.remove('row-highlight-pulse');
        void targetRow.offsetWidth;
        targetRow.classList.add('row-highlight-pulse');
      }
    });

    dropdownList.appendChild(div);
  });

  dropdownMenu.style.display = 'flex';
}

function applySearchFilter() {
  const query = currentSearchQuery.trim().toLowerCase();
  const brandFilter = currentBrandFilter.trim().toLowerCase();
  const stockFilter = currentStockFilter.trim();

  let totalVisibleRows = 0;
  let matchingBrandsCount = 0;
  const matchingItemsList = [];

  const sections = document.querySelectorAll('.brand-section');

  sections.forEach(section => {
    const tbody = section.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    let sectionVisibleCount = 0;

    rows.forEach(row => {
      const model = row.getAttribute('data-model') || '';
      const brand = row.getAttribute('data-brand') || '';
      const spec = row.getAttribute('data-spec') || '';
      const color = row.getAttribute('data-color') || '';
      const price = row.getAttribute('data-price') || '';
      const onlinePrice = row.getAttribute('data-online') || '';
      const stock = row.getAttribute('data-stock') || '';

      if (!model && row.querySelector('td[colspan]')) {
        return;
      }

      const matchBrand = !brandFilter || brand.toLowerCase() === brandFilter;
      const matchStock = !stockFilter || stock === stockFilter;

      let matchQuery = true;
      if (query) {
        const fullSearchString = `${brand} ${model} ${spec} ${color} ${price} ${onlinePrice} ${stock}`.toLowerCase();
        const tokens = query.split(/\s+/).filter(Boolean);
        matchQuery = tokens.every(token => fullSearchString.includes(token));
      }

      const isMatch = matchBrand && matchStock && matchQuery;

      if (isMatch) {
        row.style.display = '';
        sectionVisibleCount++;
        totalVisibleRows++;

        const modelCell = row.querySelector('.cell-model');
        const specCell = row.querySelector('.cell-spec');
        const colorCell = row.querySelector('.cell-color');
        if (modelCell) modelCell.innerHTML = highlightSearchMatch(model, query);
        if (specCell) specCell.innerHTML = highlightSearchMatch(spec, query);
        if (colorCell) colorCell.innerHTML = highlightSearchMatch(color, query);

        if (matchingItemsList.length < 15) {
          matchingItemsList.push({
            rowId: row.id,
            brand,
            model,
            spec,
            color,
            price: price ? Number(price).toLocaleString('en-IN') : '',
            stock
          });
        }
      } else {
        row.style.display = 'none';
      }
    });

    const specialRows = tbody.querySelectorAll('tr td[colspan]');
    specialRows.forEach(td => {
      const parentRow = td.closest('tr');
      if (parentRow) {
        parentRow.style.display = sectionVisibleCount > 0 ? '' : 'none';
      }
    });

    if (sectionVisibleCount > 0) {
      section.style.display = 'block';
      matchingBrandsCount++;
    } else {
      section.style.display = 'none';
    }
  });

  const statsBar = document.getElementById('searchStatsBar');
  const statsText = document.getElementById('searchStatsText');
  const noResultsEl = document.getElementById('searchNoResults');
  const noResultsText = document.getElementById('searchNoResultsText');
  const clearBtn = document.getElementById('searchClearBtn');

  if (clearBtn) {
    clearBtn.style.display = query ? 'flex' : 'none';
  }

  const isFiltering = Boolean(query || brandFilter || stockFilter);

  if (isFiltering) {
    if (statsBar && statsText) {
      statsBar.style.display = 'flex';
      const queryLabel = query ? ` for "${escapeHtml(query)}"` : '';
      const brandLabel = brandFilter ? ` in ${brandFilter.toUpperCase()}` : '';
      const stockLabel = stockFilter ? ` (${stockFilter})` : '';
      statsText.innerHTML = `Showing <strong>${totalVisibleRows}</strong> ${totalVisibleRows === 1 ? 'model' : 'models'} across <strong>${matchingBrandsCount}</strong> ${matchingBrandsCount === 1 ? 'brand' : 'brands'}${queryLabel}${brandLabel}${stockLabel}`;
    }

    if (totalVisibleRows === 0) {
      if (noResultsEl) {
        noResultsEl.style.display = 'block';
        if (noResultsText) {
          noResultsText.textContent = `No products match your current search and filter criteria.`;
        }
      }
    } else {
      if (noResultsEl) noResultsEl.style.display = 'none';
    }
  } else {
    if (statsBar) statsBar.style.display = 'none';
    if (noResultsEl) noResultsEl.style.display = 'none';
  }

  renderSearchDropdown(query, matchingItemsList);
}

function resetAllSearchAndFilters() {
  currentSearchQuery = '';
  currentBrandFilter = '';
  currentStockFilter = '';

  const searchInput = document.getElementById('searchInput');
  const brandSelect = document.getElementById('brandFilterSelect');
  const stockSelect = document.getElementById('stockFilterSelect');
  const dropdownMenu = document.getElementById('searchDropdownMenu');

  if (searchInput) searchInput.value = '';
  if (brandSelect) brandSelect.value = '';
  if (stockSelect) stockSelect.value = '';
  if (dropdownMenu) dropdownMenu.style.display = 'none';

  updateActiveBrandChip('');
  applySearchFilter();
}

function setupSearchListeners() {
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const brandSelect = document.getElementById('brandFilterSelect');
  const stockSelect = document.getElementById('stockFilterSelect');
  const resetAllBtn = document.getElementById('searchResetAllBtn');
  const clearEmptyBtn = document.getElementById('clearSearchFromEmptyBtn');
  const dropdownMenu = document.getElementById('searchDropdownMenu');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentSearchQuery = searchInput.value;
        applySearchFilter();
      }, 70);
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length > 0) {
        applySearchFilter();
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      currentSearchQuery = '';
      if (dropdownMenu) dropdownMenu.style.display = 'none';
      applySearchFilter();
      if (searchInput) searchInput.focus();
    });
  }

  if (brandSelect) {
    brandSelect.addEventListener('change', () => {
      currentBrandFilter = brandSelect.value;
      updateActiveBrandChip(currentBrandFilter);
      applySearchFilter();
    });
  }

  if (stockSelect) {
    stockSelect.addEventListener('change', () => {
      currentStockFilter = stockSelect.value;
      applySearchFilter();
    });
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', resetAllSearchAndFilters);
  }

  if (clearEmptyBtn) {
    clearEmptyBtn.addEventListener('click', resetAllSearchAndFilters);
  }

  // Keyboard shortcut: Press / or Ctrl+K to focus search input
  window.addEventListener('keydown', e => {
    if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === 'Escape') {
      if (dropdownMenu) dropdownMenu.style.display = 'none';
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
      }
    }
  });

  // Click outside to close dropdown suggestions
  document.addEventListener('click', e => {
    if (!e.target.closest('#searchPanel') && dropdownMenu) {
      dropdownMenu.style.display = 'none';
    }
  });
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

  setupSearchListeners();

  if (!initFirebase()) {
    renderHeaderContact(null);
    document.getElementById('dateStatus').textContent = 'Firebase not configured';
    document.getElementById('dateStatus').className = 'date-status date-not-found';
    document.getElementById('pageNotFound').style.display = 'block';
    document.querySelector('#pageNotFound h2').textContent = 'Configuration Required';
    document.querySelector('#pageNotFound p').textContent = 'Set your Firebase details in firebase-config.js';
    document.querySelectorAll('.brand-section').forEach(s => s.style.display = 'none');
    return;
  }

  subscribeHeaderContact();

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
