const STORAGE_KEY = 'revenueComplaintAppData';

const elements = {
  navConsumer: document.getElementById('navConsumer'),
  navLogin: document.getElementById('navLogin'),
  navDashboard: document.getElementById('navDashboard'),
  navLogout: document.getElementById('navLogout'),
  consumerSection: document.getElementById('consumerSection'),
  loginSection: document.getElementById('loginSection'),
  dashboardSection: document.getElementById('dashboardSection'),
  consumerForm: document.getElementById('consumerForm'),
  consumerConfirmation: document.getElementById('consumerConfirmation'),
  trackForm: document.getElementById('trackForm'),
  trackResult: document.getElementById('trackResult'),
  loginForm: document.getElementById('loginForm'),
  dashboardTitle: document.getElementById('dashboardTitle'),
  dashboardSubtitle: document.getElementById('dashboardSubtitle'),
  statusSummary: document.getElementById('statusSummary'),
  dashboardFilters: document.getElementById('dashboardFilters'),
  complaintList: document.getElementById('complaintList'),
  dashboardEmpty: document.getElementById('dashboardEmpty'),
  statusFilter: document.getElementById('statusFilter'),
  complaintCardTemplate: document.getElementById('complaintCardTemplate'),
};

const STATUS = {
  SUBMITTED: 'Submitted',
  FIELD_VERIFIED: 'Field Verified',
  BILLING_REVIEWED: 'Billing Reviewed',
  ADR_FORWARDED: 'ADR Forwarded',
  DDR_APPROVED: 'Final Approved',
};

const ROLE_CONFIG = {
  fieldOfficer: { label: 'Field Officer', canReview: true, filter: complaint => complaint.status === STATUS.SUBMITTED },
  billingOfficer: { label: 'Billing Officer', canReview: true, filter: complaint => complaint.status === STATUS.FIELD_VERIFIED },
  adr: { label: 'Assistant Director Revenue', canReview: true, filter: complaint => complaint.status === STATUS.BILLING_REVIEWED },
  ddr: { label: 'Deputy Director Revenue', canReview: true, filter: complaint => complaint.status === STATUS.ADR_FORWARDED },
};

const statusClass = {
  [STATUS.SUBMITTED]: 'status-submitted',
  [STATUS.FIELD_VERIFIED]: 'status-verified',
  [STATUS.BILLING_REVIEWED]: 'status-billing',
  [STATUS.ADR_FORWARDED]: 'status-adr',
  [STATUS.DDR_APPROVED]: 'status-approved',
};

let appData = null;
let currentUser = null;
let currentFilter = 'all';

function loadStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse saved data', error);
  }
  return { users: [], complaints: [], nextComplaintId: 1 };
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function initApp() {
  appData = loadStorage();
  if (!appData.users || appData.users.length === 0) {
    appData.users = [
      { username: 'fieldA', password: 'fieldA123', role: 'fieldOfficer', block: 'A' },
      { username: 'fieldB', password: 'fieldB123', role: 'fieldOfficer', block: 'B' },
      { username: 'billing', password: 'billing123', role: 'billingOfficer' },
      { username: 'adr', password: 'adr123', role: 'adr' },
      { username: 'ddr', password: 'ddr123', role: 'ddr' },
    ];
  }
  if (!appData.complaints) {
    appData.complaints = [];
  }
  if (!appData.nextComplaintId) {
    appData.nextComplaintId = 1;
  }
  saveStorage();
  attachEvents();
  showView('consumer');
  buildStatusFilter();
}

function attachEvents() {
  elements.navConsumer.addEventListener('click', () => showView('consumer'));
  elements.navLogin.addEventListener('click', () => showView('login'));
  elements.navDashboard.addEventListener('click', () => showView('dashboard'));
  elements.navLogout.addEventListener('click', logout);

  elements.consumerForm.addEventListener('submit', handleComplaintSubmit);
  elements.trackForm.addEventListener('submit', handleTrackSubmit);
  elements.loginForm.addEventListener('submit', handleLoginSubmit);
  elements.statusFilter.addEventListener('change', event => {
    currentFilter = event.target.value;
    renderDashboard();
  });
}

function showView(view) {
  elements.consumerSection.classList.toggle('hidden', view !== 'consumer');
  elements.loginSection.classList.toggle('hidden', view !== 'login');
  elements.dashboardSection.classList.toggle('hidden', view !== 'dashboard');
  elements.navDashboard.classList.toggle('hidden', !currentUser);
  elements.navLogout.classList.toggle('hidden', !currentUser);
  elements.navLogin.classList.toggle('hidden', view === 'login' || !!currentUser);
  elements.navConsumer.classList.toggle('hidden', false);
  const dashboardVisible = view === 'dashboard' && !!currentUser;
  elements.dashboardFilters.classList.toggle('hidden', !dashboardVisible);

  if (view === 'dashboard') {
    if (!currentUser) {
      showView('login');
      return;
    }
    updateDashboardHeader();
    renderDashboard();
  } else if (view === 'login') {
    elements.loginForm.reset();
  }
}

function updateDashboardHeader() {
  const roleLabel = ROLE_CONFIG[currentUser.role]?.label || 'Dashboard';
  elements.dashboardTitle.textContent = `${roleLabel} Dashboard`;
  elements.dashboardSubtitle.textContent = `Logged in as ${currentUser.username}${currentUser.block ? ' (Block ' + currentUser.block + ')' : ''}`;
  buildStatusSummary();
}

function buildStatusFilter() {
  const statuses = [STATUS.SUBMITTED, STATUS.FIELD_VERIFIED, STATUS.BILLING_REVIEWED, STATUS.ADR_FORWARDED, STATUS.DDR_APPROVED];
  elements.statusFilter.innerHTML = '<option value="all">All</option>' + statuses.map(status => `<option value="${status}">${status}</option>`).join('');
}

function handleComplaintSubmit(event) {
  event.preventDefault();
  const data = new FormData(elements.consumerForm);
  const complaint = {
    id: appData.nextComplaintId++,
    createdAt: new Date().toISOString(),
    consumerName: data.get('consumerName')?.trim(),
    fatherName: data.get('fatherName')?.trim(),
    cnic: data.get('cnic')?.trim(),
    mobile: data.get('mobile')?.trim(),
    billRef: data.get('billRef')?.trim(),
    connectionType: data.get('connectionType'),
    areaBlock: data.get('areaBlock')?.trim(),
    areaDetails: data.get('areaDetails')?.trim(),
    issueType: data.get('issueType'),
    complaintDetails: data.get('complaintDetails')?.trim(),
    status: STATUS.SUBMITTED,
    history: [
      { at: new Date().toISOString(), actor: 'System', action: 'Complaint submitted by consumer' },
    ],
    comments: [],
  };

  if (!complaint.consumerName || !complaint.fatherName || !complaint.cnic || !complaint.mobile || !complaint.billRef || !complaint.areaBlock || !complaint.areaDetails || !complaint.complaintDetails) {
    alert('Please complete all required fields before submitting your complaint.');
    return;
  }

  appData.complaints.unshift(complaint);
  saveStorage();
  elements.consumerForm.reset();
  elements.consumerConfirmation.innerHTML = `<h3>Complaint Registered Successfully</h3><p>Your complaint number is <strong>#${complaint.id}</strong>. Please keep it for tracking and communication.</p><p>Status: <strong>${complaint.status}</strong></p>`;
  elements.consumerConfirmation.classList.remove('hidden');
  elements.trackResult.textContent = '';
}

function handleTrackSubmit(event) {
  event.preventDefault();
  const complaintId = Number(document.getElementById('trackId').value);
  const complaint = appData.complaints.find(item => item.id === complaintId);
  if (!complaint) {
    elements.trackResult.innerHTML = `<p>Complaint #${complaintId} not found. Please verify the number and try again.</p>`;
    return;
  }
  elements.trackResult.innerHTML = renderComplaintSummary(complaint);
}

function renderComplaintSummary(complaint) {
  return `
    <div class="complaint-summary">
      <p><strong>Complaint #${complaint.id}</strong> — status <strong>${complaint.status}</strong></p>
      <p><strong>Consumer:</strong> ${complaint.consumerName} (${complaint.connectionType})</p>
      <p><strong>Bill Reference:</strong> ${complaint.billRef}</p>
      <p><strong>Issue:</strong> ${complaint.issueType}</p>
      <p><strong>Details:</strong> ${complaint.complaintDetails}</p>
      <p><strong>Latest Notes:</strong> ${complaint.comments.length ? complaint.comments[complaint.comments.length - 1].text : 'Pending review'}</p>
    </div>`;
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const user = appData.users.find(item => item.username === username && item.password === password);
  if (!user) {
    alert('Invalid credentials. Please check username and password.');
    return;
  }
  currentUser = user;
  elements.navLogin.classList.add('hidden');
  elements.navDashboard.classList.remove('hidden');
  elements.navLogout.classList.remove('hidden');
  showView('dashboard');
}

function logout() {
  currentUser = null;
  elements.navDashboard.classList.add('hidden');
  elements.navLogout.classList.add('hidden');
  showView('consumer');
}

function getDashboardComplaints() {
  const base = appData.complaints.filter(ROLE_CONFIG[currentUser.role].filter);
  if (currentUser.role === 'fieldOfficer') {
    return base.filter(item => item.areaBlock?.toLowerCase() === currentUser.block.toLowerCase());
  }
  if (currentFilter !== 'all') {
    return base.filter(item => item.status === currentFilter);
  }
  return base;
}

function renderDashboard() {
  elements.complaintList.innerHTML = '';
  const complaints = getDashboardComplaints();
  if (complaints.length === 0) {
    elements.dashboardEmpty.classList.remove('hidden');
    return;
  }
  elements.dashboardEmpty.classList.add('hidden');
  complaints.forEach(complaint => {
    const card = buildComplaintCard(complaint);
    elements.complaintList.appendChild(card);
  });
}

function buildComplaintCard(complaint) {
  const template = elements.complaintCardTemplate.content.cloneNode(true);
  const card = template.querySelector('.complaint-card');
  const title = card.querySelector('.complaint-title');
  const meta = card.querySelector('.complaint-meta');
  const statusPill = card.querySelector('.status-pill');
  const bodyText = card.querySelector('.complaint-text');
  const details = card.querySelector('.complaint-details');
  const actions = card.querySelector('.complaint-actions');

  title.textContent = `Complaint #${complaint.id} — ${complaint.issueType}`;
  meta.innerHTML = `Submitted by <strong>${complaint.consumerName}</strong> in block <strong>${complaint.areaBlock}</strong> · ${new Date(complaint.createdAt).toLocaleString()}`;
  statusPill.textContent = complaint.status;
  statusPill.className = `status-pill ${statusClass[complaint.status] || 'status-closed'}`;
  bodyText.textContent = complaint.complaintDetails;

  details.innerHTML = `
    <div><strong>CNIC:</strong> ${complaint.cnic}</div>
    <div><strong>Mobile:</strong> ${complaint.mobile}</div>
    <div><strong>Bill Reference:</strong> ${complaint.billRef}</div>
    <div><strong>Connection Type:</strong> ${complaint.connectionType}</div>
    <div><strong>Area Details:</strong> ${complaint.areaDetails}</div>
    <div><strong>History:</strong> ${complaint.history.map(entry => `${entry.action} (${new Date(entry.at).toLocaleString()})`).join('; ')}</div>
  `;

  if (complaint.comments.length) {
    const commentsSection = document.createElement('div');
    commentsSection.innerHTML = `<strong>Comments:</strong> ${complaint.comments.map(c => `<div><em>${c.author}</em>: ${c.text}</div>`).join('')}`;
    details.appendChild(commentsSection);
  }

  if (ROLE_CONFIG[currentUser.role].canReview) {
    const input = document.createElement(currentUser.role === 'fieldOfficer' ? 'textarea' : 'textarea');
    input.placeholder = 'Enter your comments here...';
    input.rows = 3;
    input.className = 'action-comment';
    const actionButton = document.createElement('button');
    actionButton.className = 'primary';
    actionButton.type = 'button';
    actionButton.textContent = getActionLabel(currentUser.role);
    actionButton.addEventListener('click', () => handleAction(complaint.id, input.value.trim()));
    actions.appendChild(input);
    actions.appendChild(actionButton);
  }

  return card;
}

function getActionLabel(role) {
  switch (role) {
    case 'fieldOfficer': return 'Verify & Forward to Billing';
    case 'billingOfficer': return 'Review & Forward to ADR';
    case 'adr': return 'Add Recommendation & Forward';
    case 'ddr': return 'Approve Complaint';
    default: return 'Update';
  }
}

function handleAction(complaintId, commentText) {
  if (!commentText) {
    alert('Please add a comment before forwarding the complaint.');
    return;
  }
  const complaint = appData.complaints.find(item => item.id === complaintId);
  if (!complaint) {
    return;
  }

  const actionTime = new Date().toISOString();
  let nextStatus = complaint.status;
  let actionDescription = '';

  switch (currentUser.role) {
    case 'fieldOfficer':
      nextStatus = STATUS.FIELD_VERIFIED;
      actionDescription = 'Field officer verified the complaint';
      break;
    case 'billingOfficer':
      nextStatus = STATUS.BILLING_REVIEWED;
      actionDescription = 'Billing officer completed review';
      break;
    case 'adr':
      nextStatus = STATUS.ADR_FORWARDED;
      actionDescription = 'Assistant Director forwarded the complaint to DDR';
      break;
    case 'ddr':
      nextStatus = STATUS.DDR_APPROVED;
      actionDescription = 'Deputy Director approved the complaint';
      break;
    default:
      return;
  }

  complaint.status = nextStatus;
  complaint.comments.push({ author: `${ROLE_CONFIG[currentUser.role].label} ${currentUser.username}`, text: commentText, at: actionTime });
  complaint.history.push({ at: actionTime, actor: currentUser.username, action: actionDescription });
  saveStorage();
  renderDashboard();
  buildStatusSummary();
}

function buildStatusSummary() {
  const counts = {
    [STATUS.SUBMITTED]: 0,
    [STATUS.FIELD_VERIFIED]: 0,
    [STATUS.BILLING_REVIEWED]: 0,
    [STATUS.ADR_FORWARDED]: 0,
    [STATUS.DDR_APPROVED]: 0,
  };
  appData.complaints.forEach(complaint => {
    if (counts[complaint.status] !== undefined) {
      counts[complaint.status] += 1;
    }
  });
  elements.statusSummary.innerHTML = Object.entries(counts).map(([status, value]) => `<div><strong>${value}</strong> ${status}</div>`).join('');
}

initApp();
