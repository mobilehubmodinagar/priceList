let data = {};

async function loadData() {
  data = await (await fetch('data.json')).json();
}

function populateTimes(dateStr) {
  const timeSelect = document.getElementById('timeInput');
  timeSelect.innerHTML = '<option value="">Latest</option>';
  
  if (data[dateStr]) {
    const times = Object.keys(data[dateStr]).sort().reverse();
    times.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      timeSelect.appendChild(option);
    });
  }
}

function renderTable(tbodyId, items) {
  const tbody = document.getElementById(tbodyId);
  const sectionId = tbodyId + 'Sec';
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

async function updateDisplay() {
  await loadData();
  const dateStr = document.getElementById('dateInput').value;
  const timeStr = document.getElementById('timeInput').value;
  
  if (!dateStr) return;
  
  document.getElementById('dateDisplay').textContent = dateStr;
  
  let dayData = null;
  let displayTime = 'Latest';
  
  if (timeStr) {
    dayData = data[dateStr]?.[timeStr];
    displayTime = timeStr;
  } else {
    const latestTime = getLatestTimeForDate(dateStr);
    dayData = latestTime ? data[dateStr][latestTime] : null;
    displayTime = latestTime || 'No Data';
  }
  
  document.getElementById('dateStatus').innerHTML = `${displayTime}`;
  document.getElementById('dateStatus').className = 'date-status date-available';
  
  if (dayData) {
    document.getElementById('pageNotFound').style.display = 'none';
    
    renderTable('iphone', dayData.iphone || []);
    renderTable('oneplus', dayData.oneplus || []);
    renderTable('nothing', dayData.nothing || []);
    renderTable('moto', dayData.moto || []);
    renderTable('iqoo', dayData.iqoo || []);
    renderTable('tecno', dayData.tecno || []);
    renderTable('poco', dayData.poco || []);
    renderTable('infinix', dayData.infinix || []);
    renderTable('oppo', dayData.oppo || []);
    renderTable('samsung', dayData.samsung || []);
    renderTable('nokia', dayData.nokia || []);
    
  } else {
    document.getElementById('dateStatus').className = 'date-status date-not-found';
    document.getElementById('pageNotFound').style.display = 'block';
    document.querySelectorAll('.brand-section').forEach(s => s.style.display = 'none');
  }
}

function getLatestTimeForDate(dateStr) {
  const dateData = data[dateStr];
  if (!dateData) return null;
  return Object.keys(dateData).sort().reverse()[0];
}

document.addEventListener('DOMContentLoaded', async () => {
  const dateInput = document.getElementById('dateInput');
  const timeInput = document.getElementById('timeInput');
  const resetBtn = document.getElementById('resetDateBtn');
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .split('T')[0];
  
  dateInput.value = today;
  
  // Event listeners
  dateInput.onchange = async () => {
    timeInput.value = ''; // Reset time
    populateTimes(dateInput.value);
    updateDisplay();
  };
  
  timeInput.onchange = updateDisplay;
  
  resetBtn.onclick = () => {
    dateInput.value = today;
    timeInput.value = '';
    populateTimes(today);
    updateDisplay();
  };
  
  // Initial load
  await loadData();
  populateTimes(today);
  updateDisplay();
});
