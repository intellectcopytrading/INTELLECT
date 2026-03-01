/* ════════════════════════════════════════════════
   js/api.js — Wrapper Supabase REST + Session
════════════════════════════════════════════════ */

/* ── SUPABASE CLIENT ── */
const sb = (() => {
  function headers() {
    return {
      'Content-Type':  'application/json',
      'apikey':        CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
    };
  }

  async function request(url, options = {}) {
    const { headers: extraHeaders, ...restOptions } = options;
    const res = await fetch(url, {
      ...restOptions,
      headers: { ...headers(), ...(extraHeaders || {}) }, // padrão primeiro, extras por cima
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }
    // DELETE retorna 204 sem body
    if (res.status === 204) return true;
    return res.json();
  }

  function buildUrl(table, filters = {}) {
    let url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}?select=*`;
    for (const [k, v] of Object.entries(filters)) {
      url += `&${k}=eq.${encodeURIComponent(v)}`;
    }
    return url;
  }

  return {
    get(table, filters = {}) {
      return request(buildUrl(table, filters));
    },
    insert(table, data) {
      return request(`${CONFIG.SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
      });
    },
    update(table, id, data) {
      return request(`${CONFIG.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
      });
    },
    delete(table, id) {
      return request(`${CONFIG.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
      });
    },
  };
})();

/* ── SESSION MANAGER ── */
const Session = (() => {
  function get() {
    try { return JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY)); } catch { return null; }
  }
  function save(data) {
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  }
  function clear() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
  }
  function isExpired(session) {
    return !session?.ts || (Date.now() - session.ts) > CONFIG.SESSION_TTL;
  }
  return { get, save, clear, isExpired };
})();

/* ── DATA HELPERS ── */

/** Mapeia snake_case do Supabase → camelCase do app */
function mapClient(r) {
  return {
    id:        r.id,
    email:     r.email,
    senha:     r.senha,
    nome:      r.nome      || '',
    whats:     r.whats     || '',
    plano:     r.plano     || '',
    banca:     r.banca     || 0,
    bfLogin:   r.bf_login  || '',
    bfSenha:   r.bf_senha  || '',
    status:    r.status    || 'Pendente',
    botAtivo:  r.bot_ativo || false,
    botE1:     r.bot_e1   || false,
    botE2:     r.bot_e2   || false,
    botE3:     r.bot_e3   || false,
    roi:       r.roi       || 0,
    lucro:     r.lucro     || 0,
    ops:       r.ops       || 0,
    vencimento:r.vencimento && !isNaN(new Date(r.vencimento))
               ? r.vencimento
               : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    nota:      r.nota      || '',
    cadastro:  r.cadastro  || new Date().toISOString(),
    historico: [],
  };
}

/** Calcula vencimento com base no plano */
function calcVencimento(plano) {
  const d = new Date();
  if (plano.includes('Anual')) d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/** Busca todos os clientes */
async function getClients() {
  try { return await sb.get('clientes'); } catch { return []; }
}
