/* ── Admin Dashboard JS ──────────────────────────────────
   Single-file SPA. No framework — pure vanilla JS.
   Sections: Auth · API · State · Router · Views · UI Helpers
───────────────────────────────────────────────────────── */

'use strict';

// ─────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────
const Auth = {
  getToken () { return localStorage.getItem('lp_token'); },
  setToken (t) { localStorage.setItem('lp_token', t); },
  clear ()    { localStorage.removeItem('lp_token'); },
  isLoggedIn (){ return !!this.getToken(); }
};

// ─────────────────────────────────────────────────────────
// API LAYER — thin fetch wrapper
// ─────────────────────────────────────────────────────────
const api = {
  async request (method, path, body, isForm = false) {
    const headers = {};
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isForm ? body : JSON.stringify(body);

    const res  = await fetch(`/admin${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  // Auth
  login  (u, p) { return this.request('POST', '/login', { username: u, password: p }); },

  // Clients
  getClients (q = '')  { return this.request('GET', `/clients${q}`); },
  getClient  (id)      { return this.request('GET', `/clients/${id}`); },
  createClient (data)  { return this.request('POST', '/clients', data); },
  updateClient (id, d) { return this.request('PUT', `/clients/${id}`, d); },
  toggleClient (id)    { return this.request('PATCH', `/clients/${id}/toggle`); },
  deleteClient (id)    { return this.request('DELETE', `/clients/${id}`); },

  // Profile image
  uploadImage (id, file) {
    const fd = new FormData();
    fd.append('image', file);
    return this.request('POST', `/clients/${id}/image`, fd, true);
  },
  deleteImage (id) { return this.request('DELETE', `/clients/${id}/image`); },

  // Links
  getLinks    (id)       { return this.request('GET',    `/clients/${id}/links`); },
  addLink     (id, data) { return this.request('POST',   `/clients/${id}/links`, data); },
  updateLink  (id, lid, data) { return this.request('PUT', `/clients/${id}/links/${lid}`, data); },
  deleteLink  (id, lid) { return this.request('DELETE', `/clients/${id}/links/${lid}`); },
  reorderLinks(id, order){ return this.request('PUT',   `/clients/${id}/links/reorder/apply`, { order }); },

  // QR
  qrDataUrl (id) { return this.request('GET', `/clients/${id}/qr?format=dataurl`); },
};

// ─────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────
const State = {
  clients:       [],   // full list
  currentClient: null, // client being edited
  editingLinkId: null, // link being edited
};

// ─────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────
function toast (msg, type = 'default', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ─────────────────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────────────────
function openModal  (id) { document.getElementById(id).classList.add('open'); }
function closeModal (id) { document.getElementById(id).classList.remove('open'); }

function closeAllModals () {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// ─────────────────────────────────────────────────────────
// ROUTER — switches between views
// ─────────────────────────────────────────────────────────
const Router = {
  current: 'overview',

  go (view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add('active');

    const navEl = document.querySelector(`[data-view="${view}"]`);
    if (navEl) navEl.classList.add('active');

    this.current = view;

    // Lazy-load view content
    if (view === 'overview') Views.loadOverview();
    if (view === 'clients')  Views.loadClients();
  }
};

// ─────────────────────────────────────────────────────────
// VIEWS
// ─────────────────────────────────────────────────────────
const Views = {

  // ── Overview stats ────────────────────────────────────
  async loadOverview () {
    try {
      const clients = await api.getClients();
      State.clients = clients;

      const total    = clients.length;
      const live     = clients.filter(c => c.active).length;
      const hidden   = total - live;
      const totalViews = clients.reduce((sum, c) => sum + (c.stats?.views || 0), 0);

      document.getElementById('stat-total').textContent   = total;
      document.getElementById('stat-live').textContent    = live;
      document.getElementById('stat-hidden').textContent  = hidden;
      document.getElementById('stat-views').textContent   = totalViews.toLocaleString();

      // Recent clients table
      const recent = [...clients].slice(0, 5);
      const tbody  = document.getElementById('recent-tbody');
      tbody.innerHTML = recent.length
        ? recent.map(c => clientRow(c)).join('')
        : `<tr><td colspan="4" style="padding:24px;text-align:center;color:var(--text-3)">No clients yet</td></tr>`;

      attachRowActions(tbody);
    } catch (e) {
      toast(e.message, 'danger');
    }
  },

  // ── Clients list ──────────────────────────────────────
  async loadClients (query = '') {
    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = `<tr><td colspan="5" style="padding:28px;text-align:center;color:var(--text-3)">Loading…</td></tr>`;
    try {
      const qs = query ? `?search=${encodeURIComponent(query)}` : '';
      const clients = await api.getClients(qs);
      State.clients = clients;
      tbody.innerHTML = clients.length
        ? clients.map(c => clientRow(c, true)).join('')
        : `<tr><td colspan="5" style="padding:36px;text-align:center;color:var(--text-3)">No clients found</td></tr>`;
      attachRowActions(tbody);
    } catch (e) {
      toast(e.message, 'danger');
    }
  },

  // ── Client form (create / edit) ───────────────────────
  openCreateForm () {
    State.currentClient = null;
    State.editingLinkId = null;
    resetClientForm();
    document.getElementById('modal-client-title').textContent = 'New client';
    document.getElementById('links-section').style.display    = 'none';
    openModal('modal-client');
  },

  async openEditForm (id) {
    try {
      const client = await api.getClient(id);
      State.currentClient = client;
      fillClientForm(client);
      document.getElementById('modal-client-title').textContent = `Edit — @${client.username}`;
      document.getElementById('links-section').style.display    = 'block';
      await this.renderLinks(id);
      openModal('modal-client');
    } catch (e) {
      toast(e.message, 'danger');
    }
  },

  async saveClient () {
    const btn = document.getElementById('save-client-btn');
    const data = readClientForm();
    if (!data) return; // validation failed

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving…';

    try {
      if (State.currentClient) {
        // Update: exclude username (can't change after creation)
        const { username, ...updates } = data;
        await api.updateClient(State.currentClient._id, updates);
        toast('Client updated', 'success');
      } else {
        const newClient = await api.createClient(data);
        State.currentClient = newClient;
        document.getElementById('links-section').style.display = 'block';
        document.getElementById('modal-client-title').textContent = `Edit — @${newClient.username}`;
        toast('Client created! Now add links below.', 'success');
      }

      // Refresh list behind the modal
      if (Router.current === 'clients')  Views.loadClients();
      if (Router.current === 'overview') Views.loadOverview();

    } catch (e) {
      toast(e.message, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save';
    }
  },

  // ── Link management inside modal ──────────────────────
  async renderLinks (clientId) {
    const list = document.getElementById('link-list');
    list.innerHTML = '<p style="color:var(--text-3);font-size:13px;padding:8px 0">Loading…</p>';
    try {
      const links = await api.getLinks(clientId);
      list.innerHTML = links.length
        ? links.map(l => linkItem(l)).join('')
        : '<p style="color:var(--text-3);font-size:13px;padding:8px 0">No links yet — add one below.</p>';
      attachLinkActions(list, clientId);
    } catch (e) {
      toast(e.message, 'danger');
    }
  },

  async saveLink () {
    if (!State.currentClient) return;
    const id    = State.currentClient._id;
    const label = document.getElementById('link-label').value.trim();
    const url   = document.getElementById('link-url').value.trim();
    const icon  = document.getElementById('link-icon').value.trim() || 'link';

    if (!label) { toast('Label is required', 'warning'); return; }
    if (!url)   { toast('URL is required', 'warning');   return; }

    try {
      if (State.editingLinkId) {
        await api.updateLink(id, State.editingLinkId, { label, url, icon });
        toast('Link updated', 'success');
      } else {
        await api.addLink(id, { label, url, icon });
        toast('Link added', 'success');
      }
      resetLinkForm();
      await this.renderLinks(id);
    } catch (e) {
      toast(e.message, 'danger');
    }
  },

  // ── QR Code modal ─────────────────────────────────────
  async openQR (id) {
    const client = State.clients.find(c => c._id === id) || await api.getClient(id);
    document.getElementById('qr-client-name').textContent = client.name;
    document.getElementById('qr-url-display').textContent  = `${location.origin}/${client.username}`;
    document.getElementById('qr-img-wrap').innerHTML = '<p style="color:var(--text-3);font-size:13px">Generating…</p>';

    openModal('modal-qr');

    try {
      const { dataUrl } = await api.qrDataUrl(id);
      document.getElementById('qr-img-wrap').innerHTML = `<img src="${dataUrl}" alt="QR Code">`;
      document.getElementById('qr-download-png').onclick = () => {
        const a = document.createElement('a');
        a.href     = `/admin/clients/${id}/qr?format=png`;
        a.download = `${client.username}-qr.png`;
        a.click();
      };
      document.getElementById('qr-download-svg').onclick = () => {
        const a = document.createElement('a');
        a.href     = `/admin/clients/${id}/qr?format=svg`;
        a.download = `${client.username}-qr.svg`;
        a.click();
      };
    } catch (e) {
      toast(e.message, 'danger');
    }
  },

  // ── Delete confirm ────────────────────────────────────
  openDeleteConfirm (id, name) {
    document.getElementById('delete-client-name').textContent = name;
    document.getElementById('confirm-delete-btn').onclick = async () => {
      try {
        await api.deleteClient(id);
        closeModal('modal-delete');
        toast(`"${name}" deleted`, 'success');
        if (Router.current === 'clients')  Views.loadClients();
        if (Router.current === 'overview') Views.loadOverview();
        // If deleting the currently open client, close form modal too
        if (State.currentClient?._id === id) closeModal('modal-client');
      } catch (e) {
        toast(e.message, 'danger');
      }
    };
    openModal('modal-delete');
  },
};

// ─────────────────────────────────────────────────────────
// TEMPLATE HELPERS
// ─────────────────────────────────────────────────────────
function avatarCell (client) {
  if (client.profileImage) {
    return `<img src="/uploads/${client.profileImage}" class="table-avatar" alt="">`;
  }
  return `<div class="table-avatar-placeholder">${client.name.charAt(0).toUpperCase()}</div>`;
}

function clientRow (client, showViews = false) {
  const statusBadge = client.active
    ? `<span class="badge badge-live">● Live</span>`
    : `<span class="badge badge-hidden">Hidden</span>`;

  const themeBadge = `<span class="badge badge-${client.theme}">${client.theme}</span>`;

  const viewsCol = showViews
    ? `<td class="text-muted text-sm">${(client.stats?.views || 0).toLocaleString()} views</td>`
    : '';

  return `
  <tr>
    <td>
      <div class="client-cell">
        ${avatarCell(client)}
        <div>
          <div class="client-name">${escHtml(client.name)}</div>
          <div class="client-uname">@${client.username}</div>
        </div>
      </div>
    </td>
    <td>${statusBadge}</td>
    <td>${themeBadge}</td>
    ${viewsCol}
    <td>
      <div class="row-actions">
        <a href="/${client.username}" target="_blank" class="btn btn-ghost btn-icon" title="View page">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9"/>
            <path d="M10 2h4v4M14 2 8 8"/>
          </svg>
        </a>
        <button class="btn btn-ghost btn-icon" data-action="qr" data-id="${client._id}" title="QR Code">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="1" width="5" height="5" rx="0.5"/><rect x="10" y="1" width="5" height="5" rx="0.5"/>
            <rect x="1" y="10" width="5" height="5" rx="0.5"/><rect x="2.5" y="2.5" width="2" height="2"/>
            <rect x="11.5" y="2.5" width="2" height="2"/><rect x="2.5" y="11.5" width="2" height="2"/>
            <path d="M10 10h1.5v1.5H10zM13 10h2v2h-2zM13 13h2v2h-2zM10 13h1.5v2H10z"/>
          </svg>
        </button>
        <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${client._id}" title="Edit">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11.5 2.5a1.41 1.41 0 0 1 2 2L5 13H3v-2z"/>
          </svg>
        </button>
        <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${client._id}" data-name="${escHtml(client.name)}" title="Delete">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
          </svg>
        </button>
      </div>
    </td>
  </tr>`;
}

function linkItem (link) {
  return `
  <div class="link-item" data-link-id="${link._id}">
    <div class="link-drag">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M3 5h10M3 8h10M3 11h10"/>
      </svg>
    </div>
    <div class="link-info">
      <div class="link-info-label">${escHtml(link.label)}</div>
      <div class="link-info-url">${escHtml(link.url)}</div>
    </div>
    <div class="link-active-dot ${link.active ? '' : 'inactive'}" title="${link.active ? 'Active' : 'Hidden'}"></div>
    <button class="btn btn-ghost btn-icon" data-link-action="edit" data-link-id="${link._id}" title="Edit link">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11.5 2.5a1.41 1.41 0 0 1 2 2L5 13H3v-2z"/>
      </svg>
    </button>
    <button class="btn btn-ghost btn-icon" data-link-action="delete" data-link-id="${link._id}" title="Delete link">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
      </svg>
    </button>
  </div>`;
}

// ─────────────────────────────────────────────────────────
// ACTION DELEGATION
// ─────────────────────────────────────────────────────────
function attachRowActions (container) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, name } = btn.dataset;

    if (action === 'edit')   Views.openEditForm(id);
    if (action === 'qr')     Views.openQR(id);
    if (action === 'delete') Views.openDeleteConfirm(id, name);
    if (action === 'toggle') {
      try {
        const r = await api.toggleClient(id);
        toast(r.message, 'success');
        Views.loadClients();
      } catch (e) { toast(e.message, 'danger'); }
    }
  });
}

function attachLinkActions (container, clientId) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-link-action]');
    if (!btn) return;
    const { linkAction, linkId } = btn.dataset;

    if (linkAction === 'delete') {
      try {
        await api.deleteLink(clientId, linkId);
        toast('Link deleted', 'success');
        Views.renderLinks(clientId);
      } catch (e) { toast(e.message, 'danger'); }
    }

    if (linkAction === 'edit') {
      const links = await api.getLinks(clientId);
      const link  = links.find(l => l._id === linkId);
      if (!link) return;
      State.editingLinkId = linkId;
      document.getElementById('link-label').value = link.label;
      document.getElementById('link-url').value   = link.url;
      document.getElementById('link-icon').value  = link.icon || '';
      document.getElementById('link-form-title').textContent = 'Edit link';
      document.getElementById('cancel-link-btn').style.display = 'inline-flex';
    }
  });
}

// ─────────────────────────────────────────────────────────
// FORM HELPERS
// ─────────────────────────────────────────────────────────
function readClientForm () {
  const username = document.getElementById('f-username').value.trim();
  const name     = document.getElementById('f-name').value.trim();
  const bio      = document.getElementById('f-bio').value.trim();
  const theme    = document.querySelector('.theme-card.selected')?.dataset.theme || 'minimal';
  const active   = document.getElementById('f-active').checked;

  if (!username) { toast('Username is required', 'warning'); return null; }
  if (!name)     { toast('Name is required', 'warning');     return null; }

  const social = {};
  ['facebook','instagram','twitter','linkedin','youtube','tiktok','whatsapp'].forEach(p => {
    const val = document.getElementById(`f-social-${p}`)?.value.trim();
    if (val) social[p] = val;
  });

  return { username, name, bio, theme, active, social };
}

function fillClientForm (client) {
  document.getElementById('f-username').value = client.username;
  document.getElementById('f-username').disabled = true; // username is immutable after create
  document.getElementById('f-name').value    = client.name;
  document.getElementById('f-bio').value     = client.bio || '';
  document.getElementById('f-active').checked = client.active;
  updateCharCount('f-bio', 'bio-count', 200);

  // Theme
  document.querySelectorAll('.theme-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.theme === client.theme);
  });

  // Social
  const s = client.social || {};
  ['facebook','instagram','twitter','linkedin','youtube','tiktok','whatsapp'].forEach(p => {
    const el = document.getElementById(`f-social-${p}`);
    if (el) el.value = s[p] || '';
  });

  // Avatar
  const preview = document.getElementById('avatar-preview-el');
  if (client.profileImage) {
    preview.innerHTML = `<img src="/uploads/${client.profileImage}?t=${Date.now()}" alt="">`;
  } else {
    preview.textContent = client.name.charAt(0).toUpperCase();
  }
}

function resetClientForm () {
  document.getElementById('client-form').reset();
  document.getElementById('f-username').disabled = false;
  document.getElementById('avatar-preview-el').textContent = '?';
  document.querySelectorAll('.theme-card').forEach((c, i) => {
    c.classList.toggle('selected', i === 0); // default: minimal
  });
  updateCharCount('f-bio', 'bio-count', 200);
}

function resetLinkForm () {
  State.editingLinkId = null;
  document.getElementById('link-label').value = '';
  document.getElementById('link-url').value   = '';
  document.getElementById('link-icon').value  = '';
  document.getElementById('link-form-title').textContent = 'Add link';
  document.getElementById('cancel-link-btn').style.display = 'none';
}

function updateCharCount (inputId, countId, max) {
  const input = document.getElementById(inputId);
  const count = document.getElementById(countId);
  if (!input || !count) return;
  const len = input.value.length;
  count.textContent = `${len}/${max}`;
  count.classList.toggle('over', len > max);
}

// ─────────────────────────────────────────────────────────
// IMAGE UPLOAD
// ─────────────────────────────────────────────────────────
async function handleImageUpload (file) {
  if (!State.currentClient) { toast('Save client first before uploading image', 'warning'); return; }
  try {
    const { profileImage, profileImageUrl } = await api.uploadImage(State.currentClient._id, file);
    
    // Update local state so the rest of the UI knows about the change
    State.currentClient.profileImage = profileImage;
    document.getElementById('avatar-preview-el').innerHTML = `<img src="${profileImageUrl}?t=${Date.now()}" alt="">`;
    
    // Refresh lists in background to update table avatars
    if (Router.current === 'clients')  Views.loadClients();
    if (Router.current === 'overview') Views.loadOverview();

    toast('Profile image updated', 'success');
  } catch (e) { toast(e.message, 'danger'); }
}

// ─────────────────────────────────────────────────────────
// XSS SAFETY
// ─────────────────────────────────────────────────────────
function escHtml (str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────────
// BOOT — runs on DOMContentLoaded
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // ── Show correct screen ─────────────────────────────
  if (Auth.isLoggedIn()) {
    document.getElementById('login').style.display     = 'none';
    document.getElementById('dashboard').style.display = 'block';
    Router.go('overview');
  }

  // ── Login form ───────────────────────────────────────
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn  = document.getElementById('login-btn');
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const err  = document.getElementById('login-error');
    err.textContent = '';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const { token } = await api.login(user, pass);
      Auth.setToken(token);
      document.getElementById('login').style.display     = 'none';
      document.getElementById('dashboard').style.display = 'block';
      document.getElementById('sidebar-username').textContent = user;
      document.getElementById('sidebar-avatar-char').textContent = user.charAt(0).toUpperCase();
      Router.go('overview');
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false;
      btn.innerHTML = 'Sign in';
    }
  });

  // ── Nav items ────────────────────────────────────────
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => Router.go(btn.dataset.view));
  });

  // ── Logout ───────────────────────────────────────────
  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.clear();
    location.reload();
  });

  // ── New client button ─────────────────────────────────
  document.getElementById('new-client-btn').addEventListener('click', () => {
    Views.openCreateForm();
    if (Router.current !== 'clients') Router.go('clients');
  });

  document.getElementById('new-client-btn-2').addEventListener('click', () => {
    Views.openCreateForm();
  });

  // ── Client search ─────────────────────────────────────
  let searchTimer;
  document.getElementById('client-search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => Views.loadClients(e.target.value), 300);
  });

  // ── Save client ───────────────────────────────────────
  document.getElementById('save-client-btn').addEventListener('click', Views.saveClient.bind(Views));

  // ── Theme cards ───────────────────────────────────────
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // ── Bio char counter ──────────────────────────────────
  document.getElementById('f-bio').addEventListener('input', () => {
    updateCharCount('f-bio', 'bio-count', 200);
  });

  // ── Avatar upload ─────────────────────────────────────
  document.getElementById('avatar-upload-btn').addEventListener('click', () => {
    document.getElementById('avatar-file-input').click();
  });

  document.getElementById('avatar-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
    e.target.value = ''; // reset so same file can be re-selected
  });

  // ── Add / save link ───────────────────────────────────
  document.getElementById('save-link-btn').addEventListener('click', () => Views.saveLink());
  document.getElementById('cancel-link-btn').addEventListener('click', () => resetLinkForm());

  // ── Close modals ──────────────────────────────────────
  document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // ── Delete confirm close ──────────────────────────────
  document.getElementById('cancel-delete-btn').addEventListener('click', () => closeModal('modal-delete'));

  // ── Keyboard: Escape closes modals ───────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
});