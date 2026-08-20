const STORAGE_KEY = 'wasaBillDistributionData';

const elements = {
  billFile: document.getElementById('billFile'),
  smsTemplate: document.getElementById('smsTemplate'),
  previewMessageBtn: document.getElementById('previewMessageBtn'),
  sendSmsBtn: document.getElementById('sendSmsBtn'),
  previewMessageBox: document.getElementById('previewMessageBox'),
  consumerTableBody: document.getElementById('consumerTableBody'),
  consumerCount: document.getElementById('consumerCount'),
  totalAmount: document.getElementById('totalAmount'),
  dueCount: document.getElementById('dueCount'),
  smsStatusText: document.getElementById('smsStatusText'),
  downloadTemplateBtn: document.getElementById('downloadTemplateBtn'),
  clearDataBtn: document.getElementById('clearDataBtn'),
  smsApiUrl: document.getElementById('smsApiUrl'),
  smsApiKey: document.getElementById('smsApiKey'),
  smsSenderId: document.getElementById('smsSenderId'),
};

const DEFAULT_TEMPLATE = `Dear {{consumer_name}}, your WASA Gujrat bill for {{billing_month}} is PKR {{amount}}. Consumer No: {{consumer_number}}. Bill reference: {{bill_reference}}. Due date: {{due_date}}. Amount after due date: PKR {{amount_after_due_date}}. Pay via JazzCash or visit https://dbill.wasagujrat.gop.pk. Thank you.`;
const BILLING_WEBSITE = 'https://dbill.wasagujrat.gop.pk';

let appState = {
  consumers: [],
  smsConfig: {
    apiUrl: '',
    apiKey: '',
    senderId: 'WASAGJ',
  },
  template: DEFAULT_TEMPLATE,
  smsStatus: 'Not sent',
};

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  const saved = loadData();
  appState = {
    ...appState,
    ...saved,
    smsConfig: { ...appState.smsConfig, ...(saved.smsConfig || {}) },
    template: saved.template || DEFAULT_TEMPLATE,
    consumers: saved.consumers || [],
    smsStatus: saved.smsStatus || 'Not sent',
  };

  elements.smsTemplate.value = appState.template;
  elements.smsApiUrl.value = appState.smsConfig.apiUrl || '';
  elements.smsApiKey.value = appState.smsConfig.apiKey || '';
  elements.smsSenderId.value = appState.smsConfig.senderId || 'WASAGJ';

  elements.billFile.addEventListener('change', handleFileUpload);
  elements.previewMessageBtn.addEventListener('click', previewMessage);
  elements.sendSmsBtn.addEventListener('click', sendBulkSms);
  elements.downloadTemplateBtn.addEventListener('click', downloadSampleTemplate);
  elements.clearDataBtn.addEventListener('click', clearRecords);
  elements.smsTemplate.addEventListener('input', () => {
    appState.template = elements.smsTemplate.value.trim() || DEFAULT_TEMPLATE;
    saveData();
    previewMessage();
  });

  ['smsApiUrl', 'smsApiKey', 'smsSenderId'].forEach((field) => {
    elements[field].addEventListener('input', () => {
      appState.smsConfig = {
        apiUrl: elements.smsApiUrl.value.trim(),
        apiKey: elements.smsApiKey.value.trim(),
        senderId: elements.smsSenderId.value.trim() || 'WASAGJ',
      };
      saveData();
    });
  });

  renderSummary();
  renderConsumerTable();
  previewMessage();
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load billing data', error);
    return {};
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.error('Failed to save billing data', error);
  }
}

function clearRecords() {
  appState.consumers = [];
  appState.smsStatus = 'Not sent';
  elements.billFile.value = '';
  saveData();
  renderSummary();
  renderConsumerTable();
  previewMessage();
}

function downloadSampleTemplate() {
  const csv = [
    'consumer_name,consumer_number,mobile_number,bill_reference,billing_month,due_date,amount,amount_after_due_date',
    'Ali Khan,CN-1001,03001234567,BR-1001,August 2026,2026-08-20,2500,2750',
    'Bibi Ayesha,CN-1002,03006543210,BR-1002,August 2026,2026-08-22,3200,3500',
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wasa_bill_template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const rows = await readBillingFile(file);
    appState.consumers = rows;
    appState.smsStatus = 'Ready to send';
    saveData();
    renderSummary();
    renderConsumerTable();
    previewMessage();
    alert(`${rows.length} consumers loaded successfully.`);
  } catch (error) {
    console.error(error);
    alert('Unable to read the uploaded file. Please check the file format and columns.');
  }
}

function readBillingFile(file) {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      reject(new Error('Unsupported file type'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        let sheetData = [];

        if (isCsv) {
          const text = String(data);
          sheetData = parseCsvText(text);
        } else {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          sheetData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
        }

        const normalized = sheetData
          .map(normalizeConsumerRecord)
          .filter(Boolean);

        if (!normalized.length) {
          reject(new Error('No valid consumer rows were found. Check the header names and required fields.'));
          return;
        }

        resolve(normalized);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read the file.'));

    if (isCsv) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

function parseCsvText(text) {
  const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
  if (!rows.length) return [];

  const header = rows[0].split(',').map(cell => normalizeHeader(cell));
  return rows.slice(1).map((row) => {
    const values = splitCsvRow(row);
    return Object.fromEntries(header.map((key, index) => [key, values[index] || '']));
  });
}

function splitCsvRow(rowText) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"') {
      if (inQuotes && rowText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeConsumerRecord(row) {
  const record = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()])
  );

  const consumerName = findFirst(record, ['consumer_name', 'customer_name', 'name', 'consumer']);
  const consumerNumber = findFirst(record, ['consumer_number', 'customer_number', 'consumer_no', 'consumer_id', 'account_number', 'account_no', 'connection_number', 'connection_no']);
  const mobile = normalizeMobile(findFirst(record, ['mobile_number', 'mobile', 'phone', 'contact', 'cell_number']));
  const billingMonth = findFirst(record, ['billing_month', 'bill_month', 'month', 'bill_period']);
  const dueDate = parseDateValue(findFirst(record, ['due_date', 'date_due', 'deadline']));
  const amount = parseNumericValue(findFirst(record, ['amount', 'bill_amount', 'total_amount', 'net_amount']));
  const amountAfterDue = parseNumericValue(
    findFirst(record, ['amount_after_due_date', 'after_due_amount', 'late_amount', 'amount_after_due', 'due_amount'])
  );

  if (!consumerName || !mobile || !billingMonth || !dueDate || !amount) {
    return null;
  }

  const safeAfterDue = amountAfterDue ?? amount;

  return {
    consumerName,
    consumerNumber: consumerNumber || '',
    mobile,
    billingMonth,
    dueDate,
    amount: Number(amount),
    amountAfterDue: Number(safeAfterDue),
    billReference: findFirst(record, ['bill_reference', 'reference', 'bill_no', 'reference_number', 'bill_ref', 'consumer_id']) || '',
    smsStatus: 'pending',
  };
}

function findFirst(record, keys) {
  for (const key of keys) {
    if (record[key] && String(record[key]).trim() !== '') {
      return String(record[key]).trim();
    }
  }
  return '';
}

function normalizeMobile(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return `0${digits.slice(2)}`;
  if (digits.startsWith('03')) return digits;
  if (digits.length === 11 && digits.startsWith('3')) return digits;
  if (digits.length === 10 && digits.startsWith('3')) return `0${digits}`;
  return digits.length >= 10 ? `0${digits.slice(-10)}` : '';
}

function parseNumericValue(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDateValue(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return formatDate(date);
  }

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const safeYear = year.length === 2 ? `20${year}` : year;
    const parsed = new Date(`${safeYear}-${month}-${day}`);
    return Number.isNaN(parsed.getTime()) ? raw : formatDate(parsed);
  }

  return raw;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderSummary() {
  const totalAmount = appState.consumers.reduce((sum, person) => sum + Number(person.amount || 0), 0);
  const dueCount = appState.consumers.filter((person) => Number(person.amountAfterDue || 0) > Number(person.amount || 0)).length;

  elements.consumerCount.textContent = String(appState.consumers.length);
  elements.totalAmount.textContent = `PKR ${formatCurrency(totalAmount)}`;
  elements.dueCount.textContent = String(dueCount);
  elements.smsStatusText.textContent = appState.smsStatus || 'Not sent';
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function renderConsumerTable() {
  if (!appState.consumers.length) {
    elements.consumerTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No consumer records uploaded yet.</td></tr>';
    return;
  }

  elements.consumerTableBody.innerHTML = appState.consumers
    .map((person) => {
      const statusClass = person.smsStatus === 'sent' ? 'sent' : person.smsStatus === 'simulated' ? 'simulated' : 'pending';
      const messageText = person.smsStatus === 'sent' ? 'Sent' : person.smsStatus === 'simulated' ? 'Simulated' : 'Pending';
      return `
        <tr>
          <td>${escapeHtml(person.consumerName)}</td>
          <td>${escapeHtml(person.consumerNumber || '—')}</td>
          <td>${escapeHtml(person.billReference || '—')}</td>
          <td>${escapeHtml(person.mobile)}</td>
          <td>${escapeHtml(person.billingMonth)}</td>
          <td>${escapeHtml(person.dueDate)}</td>
          <td>PKR ${formatCurrency(person.amount)}</td>
          <td>PKR ${formatCurrency(person.amountAfterDue)}</td>
          <td><span class="status-chip ${statusClass}">${messageText}</span></td>
        </tr>
      `;
    })
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function previewMessage() {
  if (!appState.consumers.length) {
    elements.previewMessageBox.textContent = 'No billing data loaded yet.';
    return;
  }

  const firstConsumer = appState.consumers[0];
  const message = buildMessage(firstConsumer, appState.template);
  elements.previewMessageBox.textContent = message;
}

function buildMessage(person, template) {
  const safeTemplate = template || DEFAULT_TEMPLATE;
  const replacements = {
    '{{consumer_name}}': person.consumerName,
    '{{consumer_number}}': person.consumerNumber || 'N/A',
    '{{billing_month}}': person.billingMonth,
    '{{bill_reference}}': person.billReference || 'N/A',
    '{{due_date}}': person.dueDate,
    '{{amount}}': formatCurrency(person.amount),
    '{{amount_after_due_date}}': formatCurrency(person.amountAfterDue),
    '{{payment_method}}': 'JazzCash',
    '{{billing_website}}': BILLING_WEBSITE,
  };

  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value),
    safeTemplate
  );
}

async function sendBulkSms() {
  if (!appState.consumers.length) {
    alert('Please upload a billing file first.');
    return;
  }

  const config = appState.smsConfig;
  const hasLiveGateway = Boolean(config.apiUrl && config.apiKey);

  if (!hasLiveGateway) {
    appState.consumers = appState.consumers.map((person) => ({
      ...person,
      smsStatus: 'simulated',
    }));
    appState.smsStatus = 'Simulated';
    saveData();
    renderSummary();
    renderConsumerTable();
    elements.previewMessageBox.textContent = appState.consumers.map((person) => buildMessage(person, appState.template)).join('\n\n');
    alert('No live SMS gateway configured. SMS messages were prepared in simulation mode.');
    return;
  }

  try {
    let sentCount = 0;
    for (const person of appState.consumers) {
      const message = buildMessage(person, appState.template);
      const payload = {
        mobile: person.mobile,
        message,
        senderId: config.senderId,
        consumerName: person.consumerName,
        consumerNumber: person.consumerNumber,
        billReference: person.billReference,
        billingMonth: person.billingMonth,
      };

      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}`);
      }

      person.smsStatus = 'sent';
      sentCount += 1;
    }

    appState.smsStatus = `${sentCount} sent`;
    saveData();
    renderSummary();
    renderConsumerTable();
    alert(`${sentCount} SMS messages sent successfully.`);
  } catch (error) {
    console.error('SMS send failed:', error);
    alert('SMS sending failed. Please check the gateway URL and API configuration.');
  }
}
