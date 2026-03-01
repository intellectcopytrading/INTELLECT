/* ════════════════════════════════════════════════
   js/admin.js — Painel administrativo v2
════════════════════════════════════════════════ */

/* ── NAVEGAÇÃO ADMIN ── */
async function loadAdminPanel() {
  show('appAdmin');
  adminTab('dashboard', document.querySelector('#appAdmin .nav-item'));
}

function adminTab(tab, el) {
  document.querySelectorAll('#appAdmin .nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const map = {
    dashboard:   renderAdminDashboard,
    clientes:    renderAdminClientes,
    novo:        renderAdminNovoCliente,
    estrategias: renderAdminEstrategias,
    config:      renderAdminConfig,
  };
  map[tab]?.();
}

/* ════════════════════════════════════════════════
   DASHBOARD ADMIN
════════════════════════════════════════════════ */
async function renderAdminDashboard() {
  const main = document.getElementById('adminMain');
  main.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div>Carregando...</div>';

  const clientes = await getClients();
  if (!clientes.length) {
    main.innerHTML = '<div class="panel"><div class="empty"><div class="empty-icon">👥</div>Nenhum cliente cadastrado.</div></div>';
    return;
  }

  const hoje = new Date();
  const ativos   = clientes.filter(c => c.status === 'Ativo').length;
  const pendentes = clientes.filter(c => c.status === 'Pendente').length;
  const botsAtivos = clientes.filter(c => c.bot_ativo || c.bot_e1 || c.bot_e2 || c.bot_e3).length;
  const vencendo  = clientes.filter(c => {
    const d = new Date(c.vencimento);
    const dias = Math.round((d - hoje) / 86_400_000);
    return dias >= 0 && dias <= 7;
  }).length;
  const vencidos = clientes.filter(c => new Date(c.vencimento) < hoje).length;

  // Cards por cliente
  const cards = clientes.map(c => {
    const vc = new Date(c.vencimento);
    const dias = Math.round((vc - hoje) / 86_400_000);
    const pagStatus = dias < 0
      ? `<span style="color:var(--red);font-weight:600">● VENCIDO</span>`
      : dias <= 7
        ? `<span style="color:var(--yellow);font-weight:600">● VENCE EM ${dias}d</span>`
        : `<span style="color:var(--green);font-weight:600">● EM DIA</span>`;

    const botsAtivosCliente = _botsAtivosCliente(c);

    return `
      <div class="panel" style="cursor:pointer;transition:border .2s" onclick="abrirModalCliente('${esc(String(c.id))}')"
           onmouseover="this.style.borderColor='var(--green2)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.8rem">
          <div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:.7rem;font-weight:600">${esc(c.nome || c.email.split('@')[0])}</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;color:var(--muted)">${esc(c.email)}</div>
          </div>
          ${pagStatus}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.8rem">
          <div style="background:var(--s2);border-radius:8px;padding:.5rem .7rem">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:.52rem;color:var(--muted);margin-bottom:.2rem">ROI</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:${(c.roi||0)>=0?'var(--green)':'var(--red)'}">
              ${(c.roi||0)>=0?'+':''}${c.roi||0}%
            </div>
          </div>
          <div style="background:var(--s2);border-radius:8px;padding:.5rem .7rem">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:.52rem;color:var(--muted);margin-bottom:.2rem">LUCRO</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:${(c.lucro||0)>=0?'var(--green)':'var(--red)'}">
              R$${(c.lucro||0).toFixed(0)}
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.3rem">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:var(--muted2)">
            ${esc(c.plano || '—')}
          </div>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            ${botsAtivosCliente.length
              ? botsAtivosCliente.map(b => `<span class="badge active-badge" style="font-size:.52rem"><span class="badge-dot pulse"></span>${esc(b)}</span>`).join('')
              : `<span class="badge inactive-badge" style="font-size:.52rem"><span class="badge-dot"></span>SEM BOT</span>`}
          </div>
        </div>
        ${c.whats ? `
        <div style="margin-top:.7rem;padding-top:.7rem;border-top:1px solid var(--border2)">
          <a href="https://wa.me/55${esc(c.whats.replace(/\D/g,''))}" target="_blank"
             onclick="event.stopPropagation()"
             style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:var(--green);text-decoration:none">
            💬 ${esc(c.whats)}
          </a>
        </div>` : ''}
      </div>`;
  }).join('');

  main.innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">DASHBOARD ADMIN</div>

    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <div class="kpi g">
        <div class="kpi-label">Clientes Ativos</div>
        <div class="kpi-val g">${ativos}</div>
        <div class="kpi-sub">de ${clientes.length} total</div>
      </div>
      <div class="kpi y">
        <div class="kpi-label">Pendentes</div>
        <div class="kpi-val y">${pendentes}</div>
        <div class="kpi-sub">aguardando config</div>
      </div>
      <div class="kpi b">
        <div class="kpi-label">Bots Ativos</div>
        <div class="kpi-val b">${botsAtivos}</div>
        <div class="kpi-sub">clientes com bot</div>
      </div>
      <div class="kpi ${vencidos > 0 ? 'r' : 'y'}">
        <div class="kpi-label">Pagamentos</div>
        <div class="kpi-val ${vencidos > 0 ? 'r' : 'y'}">${vencidos > 0 ? vencidos + ' venc.' : vencendo + ' alert.'}</div>
        <div class="kpi-sub">${vencidos > 0 ? 'vencidos' : 'vencem em 7d'}</div>
      </div>
    </div>

    <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;letter-spacing:2px;color:var(--muted)">
      // CLIENTES — clique para editar
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
      ${cards}
    </div>
  `;
}

/* ── Helper: bots ativos de um cliente ── */
function _botsAtivosCliente(c) {
  const bots = [];
  if (c.bot_e1 || c.botE1) bots.push('E1');
  if (c.bot_e2 || c.botE2) bots.push('E2');
  if (c.bot_e3 || c.botE3) bots.push('E3');
  // fallback: bot_ativo mas sem campos individuais
  if (!bots.length && (c.bot_ativo || c.botAtivo)) bots.push('BOT');
  return bots;
}

/* ════════════════════════════════════════════════
   LISTA DE CLIENTES
════════════════════════════════════════════════ */
async function renderAdminClientes() {
  const main = document.getElementById('adminMain');
  main.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div>Carregando...</div>';

  const clientes = await getClients();
  if (!clientes.length) {
    main.innerHTML = '<div class="panel"><div class="empty"><div class="empty-icon">👥</div>Nenhum cliente cadastrado.</div></div>';
    return;
  }

  const hoje = new Date();
  const rows = clientes.map(c => {
    const statusClass = c.status === 'Ativo' ? 'active-badge' : c.status === 'Pendente' ? 'pending-badge' : 'inactive-badge';
    const vc = new Date(c.vencimento);
    const dias = Math.round((vc - hoje) / 86_400_000);
    const pagCol = dias < 0
      ? `<span style="color:var(--red);font-size:.65rem">VENCIDO</span>`
      : dias <= 7
        ? `<span style="color:var(--yellow);font-size:.65rem">${dias}d</span>`
        : `<span style="color:var(--green);font-size:.65rem">OK</span>`;

    const botsCol = _botsAtivosCliente(c).join(', ') || '—';

    return `
      <tr onclick="abrirModalCliente('${esc(String(c.id))}')">
        <td style="font-family:'IBM Plex Mono',monospace;font-size:.68rem">${esc(c.email)}</td>
        <td>${esc(c.nome) || '—'}</td>
        <td style="font-size:.72rem">${esc(c.plano) || '—'}</td>
        <td><span class="badge ${statusClass}"><span class="badge-dot"></span>${esc(c.status) || 'Pendente'}</span></td>
        <td style="font-family:'IBM Plex Mono',monospace;color:var(--green)">${c.roi != null ? (c.roi >= 0 ? '+' : '') + c.roi + '%' : '—'}</td>
        <td>${pagCol}</td>
        <td style="font-family:'IBM Plex Mono',monospace;font-size:.65rem">${esc(botsCol)}</td>
        <td style="font-family:'IBM Plex Mono',monospace">${esc(c.whats) || '—'}</td>
      </tr>`;
  }).join('');

  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">
        CLIENTES <span style="font-size:1rem;color:var(--muted)">(${clientes.length})</span>
      </div>
      <button class="btn btn-sm" onclick="adminTab('novo',null)">+ NOVO</button>
    </div>
    <div class="panel">
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Email</th><th>Nome</th><th>Plano</th><th>Status</th><th>ROI</th><th>Pgto</th><th>Bots</th><th>WhatsApp</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════
   MODAL EDITAR CLIENTE
════════════════════════════════════════════════ */
async function abrirModalCliente(id) {
  let c;
  try {
    const rows = await sb.get('clientes', { id });
    c = rows?.[0];
  } catch { c = null; }
  if (!c) return;

  document.getElementById('modal-title').textContent = 'CLIENTE — ' + (c.nome || c.email);

  // Busca histórico de operações do cliente
  let hist = [];
  try { hist = await sb.get('historico', { cliente_id: c.id }); } catch {}

  const histRows = (hist || []).map(h => `
    <tr>
      <td>${esc(h.data || '')}</td>
      <td style="font-family:'IBM Plex Mono',monospace">R$${(h.banca||0).toFixed(0)}</td>
      <td style="color:${(h.lucro||0)>=0?'var(--green)':'var(--red)'};font-family:'IBM Plex Mono',monospace">
        ${(h.lucro||0)>=0?'+':''}R$${(h.lucro||0).toFixed(2)}
      </td>
      <td style="color:var(--blue);font-family:'IBM Plex Mono',monospace">${(h.roi||0).toFixed(1)}%</td>
      <td>
        <button class="btn btn-sm btn-danger" style="padding:.2rem .5rem;font-size:.6rem"
          onclick="deletarOperacao('${esc(String(h.id))}','${esc(String(c.id))}')">✕</button>
      </td>
    </tr>`).join('');

  document.getElementById('modal-body').innerHTML = `
    <!-- DADOS PESSOAIS -->
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin-bottom:.8rem">// DADOS PESSOAIS</div>
    <div class="field"><label>Nome</label><input type="text" id="m-nome" value="${esc(c.nome)}"></div>
    <div class="field"><label>Email</label><input type="text" value="${esc(c.email)}" disabled style="opacity:.5"></div>
    <div class="field"><label>WhatsApp</label><input type="text" id="m-whats" value="${esc(c.whats)}"></div>
    <div class="field">
      <label>Plano</label>
      <select id="m-plano">
        <option value="">—</option>
        ${buildPlanosOptions(c.plano)}
      </select>
    </div>

    <!-- ACESSO BETFAIR -->
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin:.8rem 0">// ACESSO BETFAIR</div>
    <div class="field">
      <label>Login Betfair</label>
      <input type="text" id="m-bfl" value="${esc(c.bf_login || '')}" placeholder="email@betfair.com">
    </div>
    <div class="field">
      <label>Senha Betfair
        <button type="button" onclick="toggleReveal('m-bfs','m-bfs-btn')" id="m-bfs-btn"
          style="margin-left:.5rem;background:none;border:1px solid var(--border2);border-radius:4px;color:var(--muted);font-size:.6rem;padding:.1rem .4rem;cursor:pointer">
          👁 revelar
        </button>
      </label>
      <input type="password" id="m-bfs" value="${esc(c.bf_senha || '')}" placeholder="••••••••">
    </div>

    <!-- STATUS E BOTS -->
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin:.8rem 0">// STATUS E BOTS</div>
    <div class="field-row">
      <div class="field">
        <label>Status</label>
        <select id="m-status">
          <option value="Pendente" ${c.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
          <option value="Ativo"    ${c.status === 'Ativo'    ? 'selected' : ''}>Ativo</option>
          <option value="Inativo"  ${c.status === 'Inativo'  ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
      <div class="field">
        <label>Bot (geral)</label>
        <select id="m-bot">
          <option value="false" ${!c.bot_ativo ? 'selected' : ''}>Não</option>
          <option value="true"  ${c.bot_ativo  ? 'selected' : ''}>Sim</option>
        </select>
      </div>
    </div>

    <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;margin-bottom:1rem">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin-bottom:.6rem">BOTS POR ESTRATÉGIA</div>
      <div style="display:flex;flex-direction:column;gap:.5rem">
        ${ESTRATEGIAS.map(e => `
          <label style="display:flex;align-items:center;gap:.6rem;cursor:pointer;font-size:.75rem">
            <input type="checkbox" id="m-bot-e${e.id}" ${c['bot_e'+e.id] ? 'checked' : ''}
              style="width:16px;height:16px;accent-color:var(--green);cursor:pointer">
            <span>${e.icone} ${esc(e.nome)} — ${esc(e.mercado)}</span>
            ${c['bot_e'+e.id] ? '<span class="badge active-badge" style="font-size:.52rem"><span class="badge-dot pulse"></span>ATIVO</span>' : ''}
          </label>`).join('')}
      </div>
    </div>

    <!-- RESULTADOS -->
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin:.8rem 0">// RESULTADOS</div>
    <div class="field-row">
      <div class="field"><label>ROI (%)</label><input type="number" id="m-roi" value="${c.roi || 0}" step="0.1"></div>
      <div class="field"><label>Lucro (R$)</label><input type="number" id="m-lucro" value="${c.lucro || 0}" step="0.01"></div>
    </div>
    <div class="field"><label>Operações (total)</label><input type="number" id="m-ops" value="${c.ops || 0}"></div>
    <div class="field"><label>Nota interna</label><input type="text" id="m-nota" value="${esc(c.nota)}" placeholder="Observações..."></div>
    <div class="field"><label>Nova Senha do cliente (em branco = não alterar)</label><input type="text" id="m-senha" placeholder="nova senha..."></div>

    <div class="err" id="m-err"></div>
    <button class="btn" onclick="salvarClienteAdmin('${esc(String(c.id))}')">💾 SALVAR ALTERAÇÕES</button>
    <button class="btn btn-danger" style="margin-top:.5rem" onclick="excluirCliente('${esc(String(c.id))}')">🗑 EXCLUIR CLIENTE</button>

    <!-- OPERAÇÕES -->
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin:1.2rem 0 .6rem">// ADICIONAR OPERAÇÃO</div>
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;margin-bottom:1rem">
      <div class="field-row">
        <div class="field"><label>Data</label><input type="date" id="op-data" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="field"><label>Banca (R$)</label><input type="number" id="op-banca" placeholder="5000" step="0.01"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Lucro (R$)</label><input type="number" id="op-lucro" placeholder="+200 ou -50" step="0.01"></div>
        <div class="field"><label>ROI (%)</label><input type="number" id="op-roi" placeholder="4.0" step="0.1"></div>
      </div>
      <button class="btn btn-sm" style="width:100%;margin-top:.3rem" onclick="adicionarOperacao('${esc(String(c.id))}')">➕ ADICIONAR OPERAÇÃO</button>
    </div>

    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin-bottom:.6rem">
      // HISTÓRICO (${hist.length} registros)
    </div>
    ${hist.length ? `
    <div class="tbl-wrap" style="max-height:200px;overflow-y:auto">
      <table>
        <thead><tr><th>Data</th><th>Banca</th><th>Lucro</th><th>ROI</th><th></th></tr></thead>
        <tbody>${histRows}</tbody>
      </table>
    </div>` : `<div style="font-family:'IBM Plex Mono',monospace;font-size:.65rem;color:var(--muted);padding:.5rem 0">Nenhuma operação registrada.</div>`}
  `;

  document.getElementById('modalCliente').classList.add('open');
}

/* ── Revelar senha ── */
function toggleReveal(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈 ocultar';
  } else {
    input.type = 'password';
    btn.textContent = '👁 revelar';
  }
}

/* ── Salvar cliente ── */
async function salvarClienteAdmin(id) {
  const btnSalvar = document.querySelector('#modalCliente .btn:not(.btn-danger)');
  if (btnSalvar) { btnSalvar.textContent = 'SALVANDO...'; btnSalvar.disabled = true; }

  const senhaNova = document.getElementById('m-senha').value;

  // Bots por estratégia
  const bot_e1 = document.getElementById('m-bot-e1')?.checked || false;
  const bot_e2 = document.getElementById('m-bot-e2')?.checked || false;
  const bot_e3 = document.getElementById('m-bot-e3')?.checked || false;
  const algumBot = bot_e1 || bot_e2 || bot_e3;

  const patch = {
    nome:      document.getElementById('m-nome').value.trim(),
    whats:     document.getElementById('m-whats').value.trim(),
    plano:     document.getElementById('m-plano').value,
    status:    document.getElementById('m-status').value,
    bot_ativo: document.getElementById('m-bot').value === 'true' || algumBot,
    bot_e1, bot_e2, bot_e3,
    bf_login:  document.getElementById('m-bfl').value.trim(),
    bf_senha:  document.getElementById('m-bfs').value,
    roi:       parseFloat(document.getElementById('m-roi').value)   || 0,
    lucro:     parseFloat(document.getElementById('m-lucro').value) || 0,
    ops:       parseInt(document.getElementById('m-ops').value)     || 0,
    nota:      document.getElementById('m-nota').value.trim(),
  };
  if (senhaNova) patch.senha = senhaNova;

  try {
    await sb.update('clientes', id, patch);
    showToast('✓ Cliente atualizado!');
    closeModal();
    // Atualiza a aba que estiver ativa no admin
    const activeNav = document.querySelector('#appAdmin .nav-item.active');
    const activeTab = activeNav?.textContent?.trim();
    if (activeTab?.includes('Dashboard')) renderAdminDashboard();
    else renderAdminClientes();
  } catch {
    const errEl = document.getElementById('m-err');
    if (errEl) { errEl.textContent = 'Erro ao salvar.'; errEl.classList.add('show'); }
  } finally {
    if (btnSalvar) { btnSalvar.textContent = '💾 SALVAR ALTERAÇÕES'; btnSalvar.disabled = false; }
  }
}

/* ── Adicionar operação ── */
async function adicionarOperacao(clienteId) {
  const data  = document.getElementById('op-data').value;
  const banca = parseFloat(document.getElementById('op-banca').value);
  const lucro = parseFloat(document.getElementById('op-lucro').value);
  const roi   = parseFloat(document.getElementById('op-roi').value);

  if (!data || isNaN(banca) || isNaN(lucro)) {
    showToast('Preencha data, banca e lucro.', true); return;
  }

  try {
    await sb.insert('historico', {
      cliente_id: clienteId,
      data: new Date(data).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }),
      banca, lucro, roi: roi || 0,
    });
    showToast('✓ Operação adicionada!');
    // Recarrega o modal
    closeModal();
    setTimeout(() => abrirModalCliente(clienteId), 200);
  } catch { showToast('Erro ao adicionar operação.', true); }
}

/* ── Deletar operação ── */
async function deletarOperacao(opId, clienteId) {
  if (!confirm('Remover esta operação?')) return;
  try {
    await sb.delete('historico', opId);
    showToast('Operação removida.');
    closeModal();
    setTimeout(() => abrirModalCliente(clienteId), 200);
  } catch { showToast('Erro ao remover.', true); }
}

/* ── Excluir cliente ── */
async function excluirCliente(id) {
  if (!confirm('Excluir este cliente? Ação irreversível.')) return;
  try {
    await sb.delete('clientes', id);
    showToast('Cliente excluído.');
    closeModal();
    renderAdminClientes();
  } catch { showToast('Erro ao excluir.', true); }
}

function closeModal() {
  document.getElementById('modalCliente').classList.remove('open');
}

/* ════════════════════════════════════════════════
   NOVO CLIENTE
════════════════════════════════════════════════ */
function renderAdminNovoCliente() {
  document.getElementById('adminMain').innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px;margin-bottom:1rem">NOVO CLIENTE</div>
    <div class="panel" style="max-width:500px">
      <div class="field"><label>Email *</label><input type="email" id="nc-email" placeholder="email@exemplo.com"></div>
      <div class="field"><label>Senha inicial *</label><input type="text" id="nc-senha" value="mudar123"></div>
      <div class="field"><label>Nome</label><input type="text" id="nc-nome"></div>
      <div class="field"><label>WhatsApp</label><input type="text" id="nc-whats"></div>
      <div class="field">
        <label>Plano</label>
        <select id="nc-plano">
          <option value="">Selecione...</option>
          ${buildPlanosOptions()}
        </select>
      </div>
      <div class="err" id="nc-err"></div>
      <button class="btn" onclick="criarClienteAdmin()">➕ CRIAR CLIENTE</button>
    </div>
  `;
}

async function criarClienteAdmin() {
  const email = document.getElementById('nc-email').value.trim().toLowerCase();
  const senha = document.getElementById('nc-senha').value;
  const nome  = document.getElementById('nc-nome').value.trim();
  const whats = document.getElementById('nc-whats').value.trim();
  const plano = document.getElementById('nc-plano').value;
  const errEl = document.getElementById('nc-err');
  const btn   = document.querySelector('#adminMain .btn');

  errEl.classList.remove('show');
  if (!email || !senha) {
    errEl.textContent = 'Email e senha obrigatórios.'; errEl.classList.add('show'); return;
  }
  if (btn) { btn.textContent = 'CRIANDO...'; btn.disabled = true; }

  try {
    await sb.insert('clientes', {
      email, senha, nome, whats, plano, banca: 0,
      bf_login: '', bf_senha: '', status: 'Pendente',
      bot_ativo: false, bot_e1: false, bot_e2: false, bot_e3: false,
      roi: 0, lucro: 0, ops: 0,
      vencimento: plano ? calcVencimento(plano) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    showToast(`✓ Cliente criado! Senha: ${senha}`);
    const navClientes = [...document.querySelectorAll('#appAdmin .nav-item')].find(n => n.textContent.includes('Clientes'));
    adminTab('clientes', navClientes || document.querySelector('#appAdmin .nav-item'));
  } catch (e) {
    errEl.textContent = e.message.includes('duplicate') ? 'Email já cadastrado.' : 'Erro ao criar.';
    errEl.classList.add('show');
  } finally {
    if (btn) { btn.textContent = '➕ CRIAR CLIENTE'; btn.disabled = false; }
  }
}

/* ════════════════════════════════════════════════
   ESTRATÉGIAS (admin)
════════════════════════════════════════════════ */
function renderAdminEstrategias() {
  document.getElementById('adminMain').innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px;margin-bottom:1rem">ESTRATÉGIAS</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem">
      ${ESTRATEGIAS.map(e => `
        <div class="panel">
          <div style="font-size:2rem;margin-bottom:.5rem">${e.icone}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:2px">${esc(e.nome)}</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:var(--muted);margin-bottom:.5rem">${esc(e.mercado)}</div>
          <div style="font-size:.78rem;color:var(--muted2);line-height:1.6">${esc(e.desc)}</div>
        </div>`).join('')}
    </div>
  `;
}

/* ════════════════════════════════════════════════
   CONFIGURAÇÕES (admin)
════════════════════════════════════════════════ */
function renderAdminConfig() {
  document.getElementById('adminMain').innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px;margin-bottom:1rem">CONFIGURAÇÕES</div>
    <div class="panel" style="max-width:500px">
      <div class="panel-title">Sistema</div>
      <div class="info-row"><span class="info-label">Chave PIX</span><span class="info-val" style="font-size:.65rem;word-break:break-all">${esc(CONFIG.PIX_KEY)}</span></div>
      <div class="info-row"><span class="info-label">WhatsApp Admin</span><span class="info-val">+${esc(CONFIG.WPP_ADMIN)}</span></div>
      <div class="info-row"><span class="info-label">Valor Bot</span><span class="info-val">R$ ${CONFIG.VALOR_BOT}</span></div>
      <div class="info-row"><span class="info-label">Supabase</span><span class="info-val" style="color:var(--green)">● Conectado</span></div>
    </div>
  `;
}
