/* ════════════════════════════════════════════════
   js/admin.js — Painel administrativo
════════════════════════════════════════════════ */

async function loadAdminPanel() {
  show('appAdmin');
  adminTab('clientes', document.querySelector('#appAdmin .nav-item'));
}

function adminTab(tab, el) {
  document.querySelectorAll('#appAdmin .nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const map = {
    clientes:    renderAdminClientes,
    novo:        renderAdminNovoCliente,
    estrategias: renderAdminEstrategias,
    config:      renderAdminConfig,
  };
  map[tab]?.();
}

async function renderAdminClientes() {
  const main = document.getElementById('adminMain');
  main.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div>Carregando...</div>';

  const clientes = await getClients();
  if (!clientes.length) {
    main.innerHTML = '<div class="panel"><div class="empty"><div class="empty-icon">👥</div>Nenhum cliente cadastrado.</div></div>';
    return;
  }

  const rows = clientes.map(c => {
    const statusClass = c.status === 'Ativo' ? 'active-badge' : c.status === 'Pendente' ? 'pending-badge' : 'inactive-badge';
    return `
      <tr onclick="abrirModalCliente('${esc(String(c.id))}')">
        <td style="font-family:'IBM Plex Mono',monospace;font-size:.68rem">${esc(c.email)}</td>
        <td>${esc(c.nome) || '—'}</td>
        <td style="font-size:.72rem">${esc(c.plano) || '—'}</td>
        <td><span class="badge ${statusClass}"><span class="badge-dot"></span>${esc(c.status) || 'Pendente'}</span></td>
        <td style="font-family:'IBM Plex Mono',monospace;color:var(--green)">${c.roi != null ? (c.roi >= 0 ? '+' : '') + c.roi + '%' : '—'}</td>
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
          <thead><tr><th>Email</th><th>Nome</th><th>Plano</th><th>Status</th><th>ROI</th><th>WhatsApp</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

async function abrirModalCliente(id) {
  const clientes = await getClients();
  const c = clientes.find(x => String(x.id) === String(id));
  if (!c) return;

  document.getElementById('modal-title').textContent = 'CLIENTE — ' + (c.nome || c.email);
  document.getElementById('modal-body').innerHTML = `
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
        <label>Bot Ativo</label>
        <select id="m-bot">
          <option value="false" ${!c.bot_ativo ? 'selected' : ''}>Não</option>
          <option value="true"  ${c.bot_ativo  ? 'selected' : ''}>Sim</option>
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>ROI (%)</label><input type="number" id="m-roi"   value="${c.roi   || 0}" step="0.1"></div>
      <div class="field"><label>Lucro (R$)</label><input type="number" id="m-lucro" value="${c.lucro || 0}" step="0.01"></div>
    </div>
    <div class="field"><label>Ops</label><input type="number" id="m-ops" value="${c.ops || 0}"></div>
    <div class="field"><label>Nota interna</label><input type="text" id="m-nota" value="${esc(c.nota)}" placeholder="Observações..."></div>
    <div class="field"><label>Senha (deixar em branco para não alterar)</label><input type="text" id="m-senha" placeholder="nova senha..."></div>
    <div class="err" id="m-err"></div>
    <button class="btn" onclick="salvarClienteAdmin('${esc(String(c.id))}')">💾 SALVAR</button>
    <button class="btn btn-danger" style="margin-top:.5rem" onclick="excluirCliente('${esc(String(c.id))}')">🗑 EXCLUIR</button>
  `;
  document.getElementById('modalCliente').classList.add('open');
}

async function salvarClienteAdmin(id) {
  const btnSalvar = document.querySelector('#modalCliente .btn:not(.btn-danger)');
  if (btnSalvar) { btnSalvar.textContent = 'SALVANDO...'; btnSalvar.disabled = true; }

  const senhaNova = document.getElementById('m-senha').value;
  const patch = {
    nome:      document.getElementById('m-nome').value.trim(),
    whats:     document.getElementById('m-whats').value.trim(),
    plano:     document.getElementById('m-plano').value,
    status:    document.getElementById('m-status').value,
    bot_ativo: document.getElementById('m-bot').value === 'true',
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
    renderAdminClientes();
  } catch {
    const errEl = document.getElementById('m-err');
    if (errEl) { errEl.textContent = 'Erro ao salvar.'; errEl.classList.add('show'); }
  } finally {
    if (btnSalvar) { btnSalvar.textContent = '💾 SALVAR'; btnSalvar.disabled = false; }
  }
}

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
      bf_login: '', bf_senha: '', status: 'Pendente', bot_ativo: false,
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
