let data = {};
let lastDataHash = '';

async function loadData() {
  const res = await fetch('data.json', { cache: 'no-store' });
  data = await res.json();
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

function renderTable(tbodyId, items) {
  const tbody = document.getElementById(tbodyId);
  const section = document.getElementById(tbodyId + 'Sec');

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

async function updateDisplay() {
  await loadData();

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

    const brands = [
      'iphone', 'oneplus', 'nothing', 'moto', 'iqoo', 'tecno', 
      'poco', 'infinix', 'oppo', 'samsung', 'vivo', 'realme', 
      'narzo', 'redmi', 'nokia'
    ];
    brands.forEach(brand => renderTable(brand, dayData[brand] || []));
    
  } else {
    document.getElementById('dateStatus').className = 'date-status date-not-found';
    document.getElementById('pageNotFound').style.display = 'block';
    document.querySelectorAll('.brand-section').forEach(s => s.style.display = 'none');
  }
}

/* ================= HOT RELOAD ================= */

function hotReload(interval = 30000) {
  setInterval(async () => {
    try {
      const res = await fetch('data.json', { cache: 'no-store' });
      const newData = await res.json();
      const newHash = JSON.stringify(newData);

      if (newHash !== lastDataHash) {
        data = newData;
        lastDataHash = newHash;
        updateDisplay();
        console.log('🔁 Hot reloaded data.json');
      }
    } catch (err) {
      console.error('Hot reload error:', err);
    }
  }, interval);
}

/* ================= HARD RELOAD EVENTS ================= */

// Reload when tab becomes active
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateDisplay();
  }
});

// Manual reload (Ctrl + R without page refresh)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    updateDisplay();
    console.log('🔄 Manual hard reload');
  }
});

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', async () => {
  const dateInput = document.getElementById('dateInput');
  const timeInput = document.getElementById('timeInput');
  const resetBtn = document.getElementById('resetDateBtn');

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];

  dateInput.value = today;

  dateInput.onchange = () => {
    timeInput.value = '';
    populateTimes(dateInput.value);
    updateDisplay();
  };

  timeInput.onchange = updateDisplay;

  resetBtn.onclick = () => {
    location.reload(true);
    dateInput.value = today;
    timeInput.value = '';
    populateTimes(today);
    updateDisplay();
  };

  await loadData();
  lastDataHash = JSON.stringify(data);

  populateTimes(today);
  updateDisplay();

  hotReload(); // start hot reload
});