/* ════════════════════════════════════════════════
   js/auth.js — Login, Register, Logout, Admin Auth
════════════════════════════════════════════════ */

/* ── NAVEGAÇÃO DE TELAS DE AUTH ── */
function showLogin()     { show('screenLogin'); }
function showRegister()  { show('screenRegister'); }
function showAdminLogin(){
  show('screenAdminLogin');
  setTimeout(() => document.getElementById('admin-pwd').focus(), 100);
}

/* ── ADMIN HIDDEN TRIGGER (7 cliques no canto superior esquerdo) ── */
function adminClick() {
  State.adminClicks++;
  clearTimeout(State.adminTimer);
  State.adminTimer = setTimeout(() => { State.adminClicks = 0; }, 2000);
  if (State.adminClicks >= 7) {
    State.adminClicks = 0;
    showAdminLogin();
  }
}

/* ── LOGIN CLIENTE ── */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const senha = document.getElementById('login-senha').value;
  const errEl = document.getElementById('login-err');
  const btn   = document.querySelector('#screenLogin .btn');

  errEl.classList.remove('show');
  if (!email || !senha) {
    errEl.textContent = 'Preencha email e senha.';
    errEl.classList.add('show');
    return;
  }

  if (btn) { btn.textContent = 'AGUARDE...'; btn.disabled = true; }

  try {
    const rows = await sb.get('clientes', { email });

    if (!rows?.length) {
      errEl.textContent = 'Email não encontrado. Verifique ou crie uma conta.';
      errEl.classList.add('show');
      return; // finally ainda executa — botão é resetado corretamente
    }

    const clientRow = rows.find(c => c.senha === senha);
    if (!clientRow) {
      errEl.textContent = 'Senha incorreta.';
      errEl.classList.add('show');
      return; // finally ainda executa
    }

    const hist = await sb.get('historico', { cliente_id: clientRow.id }).catch(() => []);
    const client = mapClient(clientRow);
    client.historico = (hist || []).map(h => ({ data: h.data, banca: h.banca, lucro: h.lucro, roi: h.roi }));

    Session.save({ type: 'client', id: clientRow.id, email });
    document.getElementById('login-senha').value = '';

    loadClientDashboard(client);
    startRealtime(clientRow.id);
    requestNotificationPermission();
    redirectToPlanoIfNeeded();

  } catch (e) {
    console.error('[doLogin]', e);
    errEl.textContent = 'Erro de conexão. Verifique sua internet.';
    errEl.classList.add('show');
  } finally {
    if (btn) { btn.textContent = 'ENTRAR →'; btn.disabled = false; }
  }
}

/* ── CADASTRO CLIENTE ── */
async function doRegister() {
  const email  = document.getElementById('reg-email').value.trim().toLowerCase();
  const senha  = document.getElementById('reg-senha').value;
  const senha2 = document.getElementById('reg-senha2').value;
  const errEl  = document.getElementById('reg-err');
  const btn    = document.querySelector('#screenRegister .btn');

  errEl.classList.remove('show');

  const validations = [
    [!email || !senha,       'Preencha email e senha.'],
    [senha.length < 6,       'Senha mínima de 6 caracteres.'],
    [senha !== senha2,       'As senhas não conferem.'],
  ];
  for (const [cond, msg] of validations) {
    if (cond) { errEl.textContent = msg; errEl.classList.add('show'); return; }
  }

  btn.textContent = 'AGUARDE...'; btn.disabled = true;

  try {
    const inserted = await sb.insert('clientes', {
      email, senha,
      nome: '', whats: '', plano: '', banca: 0,
      bf_login: '', bf_senha: '', status: 'Pendente',
      bot_ativo: false, bot_e1: false, bot_e2: false, bot_e3: false,
      roi: 0, lucro: 0, ops: 0,
      vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const novo = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!novo) throw new Error('Erro ao criar conta.');

    Session.save({ type: 'client', id: novo.id, email });
    ['reg-senha', 'reg-senha2', 'reg-email'].forEach(id => { document.getElementById(id).value = ''; });

    showToast('✓ Conta criada! Complete seu cadastro.');
    loadClientDashboard(mapClient(novo));

    const planoUrl = new URLSearchParams(window.location.search).get('plano');
    setTimeout(() => {
      const aba = planoUrl ? 'planos' : 'conta';
      const nav = document.querySelector(`#appClient .nav-item[data-tab="${aba}"]`);
      if (nav) clientTab(aba, nav);
    }, 500);

  } catch (e) {
    errEl.textContent = (e.message.includes('duplicate') || e.message.includes('unique'))
      ? 'Este email já está cadastrado. Faça login.'
      : 'Erro ao criar conta. Verifique sua conexão.';
    errEl.classList.add('show');
  } finally {
    btn.textContent = 'CRIAR CONTA →'; btn.disabled = false;
  }
}

/* ── LOGIN ADMIN ── */
async function doAdminLogin() {
  const pwd   = document.getElementById('admin-pwd').value;
  const errEl = document.getElementById('admin-err');
  const btn   = document.querySelector('#screenAdminLogin .btn');

  errEl.classList.remove('show');

  // Compara hash SHA-256 — senha nunca fica em texto plano no código
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  const hashHex    = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (hashHex !== CONFIG.ADMIN_PWD_HASH) {
    errEl.textContent = 'Senha incorreta.';
    errEl.classList.add('show');
    return;
  }

  btn.textContent = 'ACESSANDO...'; btn.disabled = true;

  try {
    Session.save({ type: 'admin' });
    await loadAdminPanel();
  } catch (e) {
    errEl.textContent = 'Erro ao acessar painel. Tente novamente.';
    errEl.classList.add('show');
  } finally {
    btn.textContent = 'ACESSAR →'; btn.disabled = false;
  }
}

/* ── LOGOUT ── */
async function doLogout() {
  State.clearRealtime();
  State.client = null;
  Session.clear();
  showLogin();
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
}

/* ── HELPERS ── */
function redirectToPlanoIfNeeded() {
  const planoUrl = new URLSearchParams(window.location.search).get('plano');
  if (planoUrl) {
    setTimeout(() => {
      const nav = document.querySelector('#appClient .nav-item[data-tab="planos"]');
      if (nav) clientTab('planos', nav);
    }, 400);
  }
}

function checkSenhaMatch() {
  const s1  = document.getElementById('reg-senha').value;
  const s2  = document.getElementById('reg-senha2').value;
  const msg = document.getElementById('senha-match-msg');
  if (!s2) { msg.style.display = 'none'; return; }
  msg.style.display = 'block';
  if (s1 === s2) { msg.style.color = 'var(--green)'; msg.textContent = '✓ Senhas conferem'; }
  else           { msg.style.color = 'var(--red)';   msg.textContent = '✗ Senhas não conferem'; }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/* ── REALTIME (polling) ── */
function startRealtime(clientId) {
  State.clearRealtime();
  State.realtimeTimer = setInterval(async () => {
    try {
      if (!State.client || State.client.id !== clientId) return;
      const rows = await sb.get('clientes', { id: clientId });
      if (!State.client || State.client.id !== clientId) return; // verificação pós-await
      if (!rows?.[0]) return;

      const upd = mapClient(rows[0]);
      upd.historico = State.client.historico;

      const wasBot = State.client.botAtivo;
      State.client = upd;

      const nameEl = document.getElementById('topbar-name');
      if (nameEl) nameEl.textContent = upd.nome ? upd.nome.split(' ')[0] : upd.email.split('@')[0];

      if (wasBot !== upd.botAtivo) {
        const activeNav = document.querySelector('#appClient .nav-item.active');
        if (!activeNav || activeNav.dataset.tab === 'dashboard') renderClientDashboard();
      }
    } catch { /* silencioso */ }
  }, CONFIG.REALTIME_INTERVAL_MS);
}

/* ── INICIALIZAÇÃO ── */
(async function init() {
  const session = Session.get();
  if (!session || Session.isExpired(session)) {
    Session.clear();
    showLogin();
    return;
  }

  if (session.type === 'admin') {
    loadAdminPanel();
    return;
  }

  if (session.type === 'client' && session.id) {
    try {
      const rows = await sb.get('clientes', { id: session.id });
      if (rows?.[0]) {
        const hist = await sb.get('historico', { cliente_id: session.id }).catch(() => []);
        const client = mapClient(rows[0]);
        client.historico = (hist || []).map(h => ({ data: h.data, banca: h.banca, lucro: h.lucro, roi: h.roi }));
        loadClientDashboard(client);
        startRealtime(session.id);
        requestNotificationPermission();
        redirectToPlanoIfNeeded();
        return;
      }
    } catch { /* sessão inválida */ }
    Session.clear();
  }

  showLogin();
})();
