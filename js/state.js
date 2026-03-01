/* ════════════════════════════════════════════════
   js/state.js — Estado global + utilitários de UI
════════════════════════════════════════════════ */

/* ── ESTADO GLOBAL ──
   Centralizamos aqui para evitar variáveis soltas.
   Acesse via State.get/set em vez de ler direto.
── */
const State = (() => {
  let _currentClient  = null;
  let _chartInstance  = null;
  let _realtimeTimer  = null;
  let _toastTimer     = null;
  let _adminClicks    = 0;
  let _adminTimer     = null;

  return {
    get client()        { return _currentClient; },
    set client(v)       { _currentClient = v; },

    get chart()         { return _chartInstance; },
    set chart(v)        { _chartInstance = v; },

    get realtimeTimer() { return _realtimeTimer; },
    set realtimeTimer(v){ _realtimeTimer = v; },

    get toastTimer()    { return _toastTimer; },
    set toastTimer(v)   { _toastTimer = v; },

    get adminClicks()   { return _adminClicks; },
    set adminClicks(v)  { _adminClicks = v; },

    get adminTimer()    { return _adminTimer; },
    set adminTimer(v)   { _adminTimer = v; },

    clearRealtime() {
      if (_realtimeTimer) { clearInterval(_realtimeTimer); _realtimeTimer = null; }
    },
    destroyChart() {
      if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }
    },
  };
})();

/* ════════════════════════════════════════════════
   UTILITÁRIOS DE UI
════════════════════════════════════════════════ */

/** Escapa string para uso seguro em innerHTML */
function esc(v) {
  return String(v || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/** Mostra apenas o elemento indicado, oculta todos os outros screens/layouts */
function show(id) {
  document.querySelectorAll('.screen, .app-layout').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/** Exibe uma mensagem toast (sucesso ou erro) */
function showToast(msg, isErr = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err-toast' : '');
  t.classList.add('show');
  if (State.toastTimer) clearTimeout(State.toastTimer);
  State.toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/** Abre o WhatsApp do admin */
function openWpp() {
  window.open(`https://wa.me/${CONFIG.WPP_ADMIN}?text=Ol%C3%A1%20Matheus!%20Sou%20cliente%20e%20preciso%20de%20ajuda.`, '_blank');
}

/** Gera opções <option> de planos (evita duplicação de HTML) */
function buildPlanosOptions(valorAtual = '') {
  return PLANOS.map(p =>
    `<option value="${esc(p.value)}" ${p.value === valorAtual ? 'selected' : ''}>${esc(p.label)}</option>`
  ).join('');
}

/* ── FECHAR MODAIS AO CLICAR NO OVERLAY ── */
document.addEventListener('click', function (e) {
  // Usa chamada defensiva pois as funções são definidas em arquivos carregados depois
  if (e.target.id === 'modalPagamentoPlano' && typeof fecharModalPlano === 'function') fecharModalPlano();
  if (e.target.id === 'modalCliente'        && typeof closeModal        === 'function') closeModal();
});
