/* ════════════════════════════════════════════════
   js/admin.js — Painel administrativo v3
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
    tips:        renderAdminTips,
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

  const hoje      = new Date();
  const ativos    = clientes.filter(c => c.status === 'Ativo').length;
  const pendentes = clientes.filter(c => c.status === 'Pendente').length;
  const botsAtivos= clientes.filter(c => c.bot_ativo || c.bot_e1 || c.bot_e2 || c.bot_e3).length;
  const tipsClientes = clientes.filter(c => clienteTemTips(c.plano)).length;
  const vencendo  = clientes.filter(c => {
    const dias = Math.round((new Date(c.vencimento) - hoje) / 86_400_000);
    return dias >= 0 && dias <= 7;
  }).length;
  const vencidos  = clientes.filter(c => new Date(c.vencimento) < hoje).length;

  const cards = clientes.map(c => {
    const vc   = new Date(c.vencimento);
    const dias = Math.round((vc - hoje) / 86_400_000);
    const pagStatus = dias < 0
      ? `<span style="color:var(--red);font-weight:600">● VENCIDO</span>`
      : dias <= 7
        ? `<span style="color:var(--yellow);font-weight:600">● VENCE EM ${dias}d</span>`
        : `<span style="color:var(--green);font-weight:600">● EM DIA</span>`;

    const botsAtivosCliente = _botsAtivosCliente(c);
    const isTips = clienteTemTips(c.plano);

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
            ${isTips && !botsAtivosCliente.length
              ? `<span class="badge" style="font-size:.52rem;background:rgba(56,182,255,.1);color:var(--blue)">📊 TIPS</span>`
              : botsAtivosCliente.length
                ? botsAtivosCliente.map(b => `<span class="badge active-badge" style="font-size:.52rem"><span class="badge-dot pulse"></span>${esc(b)}</span>`).join('')
                : `<span class="badge inactive-badge" style="font-size:.52rem"><span class="badge-dot"></span>SEM PLANO</span>`}
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
        <div class="kpi-label">Plano Tips</div>
        <div class="kpi-val b">${tipsClientes}</div>
        <div class="kpi-sub">com acesso a tips</div>
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

    <div class="panel" style="padding:1.2rem 1.4rem;margin-bottom:.2rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
        <div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:.55rem;letter-spacing:3px;color:var(--green);margin-bottom:.2rem">// PERFORMANCE ACUMULADA</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:1px">P&L ACUMULADO DO CANAL</div>
        </div>
        <div style="display:flex;gap:.5rem">
          <button onclick="adminChartFiltro(30,this)" class="btn btn-sm" style="font-size:.58rem;padding:.25rem .7rem;background:var(--green);color:#060910">30d</button>
          <button onclick="adminChartFiltro(90,this)" class="btn btn-sm btn-ghost" style="font-size:.58rem;padding:.25rem .7rem">90d</button>
          <button onclick="adminChartFiltro(0,this)"  class="btn btn-sm btn-ghost" style="font-size:.58rem;padding:.25rem .7rem">Tudo</button>
        </div>
      </div>
      <canvas id="adminChart" style="width:100%;max-height:260px"></canvas>
    </div>

    <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;letter-spacing:2px;color:var(--muted)">
      // CLIENTES — clique para editar
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
      ${cards}
    </div>
  \`;

  // Renderiza gráfico após inserir HTML
  setTimeout(() => _renderAdminChart(30), 50);
}

/* ── GRÁFICO ADMIN ── */
let _adminTipsData = [];

async function _renderAdminChart(dias) {
  try {
    const tips = await getTips();
    // Filtra só encerradas com data e pl_stake
    _adminTipsData = tips
      .filter(t => t.resultado && t.resultado !== 'aberta' && t.pl_stake != null && t.data)
      .sort((a,b) => new Date(a.data) - new Date(b.data));

    _desenharAdminChart(dias);
  } catch(e) { console.error('[adminChart]', e); }
}

function adminChartFiltro(dias, btn) {
  document.querySelectorAll('#adminMain .btn-sm').forEach(b => {
    b.style.background = '';
    b.style.color = '';
    b.classList.add('btn-ghost');
  });
  btn.classList.remove('btn-ghost');
  btn.style.background = 'var(--green)';
  btn.style.color = '#060910';
  _desenharAdminChart(dias);
}

function _desenharAdminChart(dias) {
  const canvas = document.getElementById('adminChart');
  if (!canvas) return;

  let dados = _adminTipsData;
  if (dias > 0) {
    const corte = new Date(Date.now() - dias * 86_400_000);
    dados = dados.filter(t => new Date(t.data) >= corte);
  }

  if (!dados.length) return;

  // Acumula P&L
  let acum = 0;
  const labels = [];
  const values = [];
  const colors = [];

  dados.forEach(t => {
    acum = parseFloat((acum + (t.pl_stake || 0)).toFixed(4));
    labels.push(new Date(t.data).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }));
    values.push(acum);
    colors.push(acum >= 0 ? 'rgba(0,229,160,0.8)' : 'rgba(255,77,79,0.8)');
  });

  const ultimo = values[values.length - 1] || 0;
  const cor    = ultimo >= 0 ? '#00e5a0' : '#ff4d4f';

  // Destroi chart anterior se existir
  if (window._adminChartInst) { window._adminChartInst.destroy(); }

  window._adminChartInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'P&L Acumulado (u)',
        data: values,
        borderColor: cor,
        backgroundColor: ultimo >= 0 ? 'rgba(0,229,160,0.06)' : 'rgba(255,77,79,0.06)',
        borderWidth: 2,
        pointRadius: dados.length > 100 ? 0 : 3,
        pointBackgroundColor: colors,
        pointBorderColor: colors,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0e1420',
          borderColor: '#1e2535',
          borderWidth: 1,
          titleColor: '#8892a4',
          bodyColor: cor,
          titleFont: { family: "'IBM Plex Mono'" },
          bodyFont: { family: "'IBM Plex Mono'", size: 13 },
          callbacks: {
            label: ctx => ` ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}u`,
          }
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#4a5568',
            font: { family: "'IBM Plex Mono'", size: 10 },
            maxTicksLimit: 12,
          },
          grid: { color: 'rgba(255,255,255,0.03)' },
        },
        y: {
          ticks: {
            color: '#4a5568',
            font: { family: "'IBM Plex Mono'", size: 10 },
            callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + 'u',
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { dash: [4,4] },
        }
      }
    }
  });
}

function _botsAtivosCliente(c) {
  const bots = [];
  if (c.bot_e1 || c.botE1) bots.push('E1');
  if (c.bot_e2 || c.botE2) bots.push('E2');
  if (c.bot_e3 || c.botE3) bots.push('E3');
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
    const vc   = new Date(c.vencimento);
    const dias = Math.round((vc - hoje) / 86_400_000);
    const pagCol = dias < 0
      ? `<span style="color:var(--red);font-size:.65rem">VENCIDO</span>`
      : dias <= 7
        ? `<span style="color:var(--yellow);font-size:.65rem">${dias}d</span>`
        : `<span style="color:var(--green);font-size:.65rem">OK</span>`;

    const botsCol  = _botsAtivosCliente(c).join(', ') || '—';
    const isTips   = clienteTemTips(c.plano);

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
        <td>
          ${isTips
            ? `<button class="btn btn-sm" style="font-size:.6rem;padding:.2rem .5rem"
                onclick="event.stopPropagation();verDashboardTipsCliente('${esc(String(c.id))}','${esc(c.nome||c.email)}')">
                📊 Tips
               </button>`
            : ''}
        </td>
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
          <thead>
            <tr>
              <th>Email</th><th>Nome</th><th>Plano</th><th>Status</th>
              <th>ROI</th><th>Pgto</th><th>Bots</th><th>WhatsApp</th><th></th>
            </tr>
          </thead>
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
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin-bottom:.8rem">// DADOS PESSOAIS</div>
    <div class="field"><label>Nome</label><input type="text" id="m-nome" value="${esc(c.nome)}"></div>
    <div class="field"><label>Email</label><input type="text" value="${esc(c.email)}" disabled style="opacity:.5"></div>
    <div class="field"><label>WhatsApp</label><input type="text" id="m-whats" value="${esc(c.whats)}"></div>
    <div class="field">
      <label>Plano</label>
      <select id="m-plano" onchange="toggleBetfairAdmin()">
        <option value="">—</option>
        ${buildPlanosOptions(c.plano)}
      </select>
    </div>

    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin:.8rem 0">// ACESSO BETFAIR</div>
    <div id="m-betfair-wrap" ${clienteTemTips(c.plano) && !_botsAtivosCliente(c).length ? 'style="display:none"' : ''}>
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
    </div>

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

    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin:1.2rem 0 .6rem">// UPLOAD RELATÓRIO DO BOT</div>
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;margin-bottom:1rem">
      <div style="font-size:.72rem;color:var(--muted2);margin-bottom:.8rem;line-height:1.6">
        Selecione os CSVs exportados do bot. O sistema processa e atualiza o dashboard do cliente automaticamente.
      </div>
      <div class="field"><label>CSV de Estatísticas <span style="color:var(--muted)">(*estatisticas*)</span></label><input type="file" id="csv-estat" accept=".csv" style="font-size:.65rem;color:var(--muted2)"></div>
      <div class="field"><label>CSV de Operações <span style="color:var(--muted)">(*operacoes*)</span></label><input type="file" id="csv-ops" accept=".csv" style="font-size:.65rem;color:var(--muted2)"></div>
      <div class="field"><label>CSV de Ordens <span style="color:var(--muted)">(*ordens* — opcional)</span></label><input type="file" id="csv-ordens" accept=".csv" style="font-size:.65rem;color:var(--muted2)"></div>
      <div id="csv-preview" style="display:none;font-family:'IBM Plex Mono',monospace;font-size:.62rem;color:var(--green);margin:.5rem 0;padding:.5rem;background:rgba(0,229,160,.06);border-radius:6px"></div>
      <button class="btn btn-sm" style="width:100%;margin-top:.3rem" onclick="processarRelatorioBot('${esc(String(c.id))}')">📊 PROCESSAR E SALVAR RELATÓRIO</button>
    </div>

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

function toggleBetfairAdmin() {
  const plano   = document.getElementById('m-plano').value;
  const temBots = document.getElementById('m-bot-e1')?.checked ||
                  document.getElementById('m-bot-e2')?.checked ||
                  document.getElementById('m-bot-e3')?.checked;
  const soTips  = clienteTemTips(plano) && !plano.includes('Bot') && !plano.includes('Anual') && !temBots;
  const wrap    = document.getElementById('m-betfair-wrap');
  if (wrap) wrap.style.display = soTips ? 'none' : '';
}

function toggleReveal(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (input.type === 'password') { input.type = 'text';     btn.textContent = '🙈 ocultar'; }
  else                           { input.type = 'password'; btn.textContent = '👁 revelar'; }
}

async function salvarClienteAdmin(id) {
  const btnSalvar = document.querySelector('#modalCliente .btn:not(.btn-danger)');
  if (btnSalvar) { btnSalvar.textContent = 'SALVANDO...'; btnSalvar.disabled = true; }

  const senhaNova = document.getElementById('m-senha').value;
  if (senhaNova && senhaNova.length < 6) {
    const errEl = document.getElementById('m-err');
    if (errEl) { errEl.textContent = 'Senha mínima de 6 caracteres.'; errEl.classList.add('show'); }
    if (btnSalvar) { btnSalvar.textContent = '💾 SALVAR ALTERAÇÕES'; btnSalvar.disabled = false; }
    return;
  }

  const bot_e1  = document.getElementById('m-bot-e1')?.checked || false;
  const bot_e2  = document.getElementById('m-bot-e2')?.checked || false;
  const bot_e3  = document.getElementById('m-bot-e3')?.checked || false;
  const algumBot= bot_e1 || bot_e2 || bot_e3;

  const patch = {
    nome:      document.getElementById('m-nome').value.trim(),
    whats:     document.getElementById('m-whats').value.trim(),
    plano:     document.getElementById('m-plano').value,
    status:    document.getElementById('m-status').value,
    bot_ativo: document.getElementById('m-bot').value === 'true' || algumBot,
    bot_e1, bot_e2, bot_e3,
    bf_login:  document.getElementById('m-bfl')?.value.trim() || '',
    bf_senha:  document.getElementById('m-bfs')?.value || '',
    roi:       parseFloat(document.getElementById('m-roi').value)   || 0,
    lucro:     parseFloat(document.getElementById('m-lucro').value) || 0,
    ops:       parseInt(document.getElementById('m-ops').value)     || 0,
    nota:      document.getElementById('m-nota').value.trim(),
  };
  if (senhaNova) patch.senha = await sha256(senhaNova);

  try {
    await sb.update('clientes', id, patch);
    showToast('✓ Cliente atualizado!');
    closeModal();
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
    closeModal();
    setTimeout(() => abrirModalCliente(clienteId), 200);
  } catch { showToast('Erro ao adicionar operação.', true); }
}

async function deletarOperacao(opId, clienteId) {
  if (!confirm('Remover esta operação?')) return;
  try {
    await sb.delete('historico', opId);
    showToast('Operação removida.');
    closeModal();
    setTimeout(() => abrirModalCliente(clienteId), 200);
  } catch { showToast('Erro ao remover.', true); }
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

/* ════════════════════════════════════════════════
   UPLOAD DE RELATÓRIO DO BOT
════════════════════════════════════════════════ */
function _parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.replace(/\r/g, ''));
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = []; let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return obj;
  });
}

async function _lerCSV(inputId) {
  return new Promise((resolve) => {
    const input = document.getElementById(inputId);
    if (!input?.files?.length) { resolve([]); return; }
    const reader = new FileReader();
    reader.onload = e => resolve(_parseCSV(e.target.result));
    reader.readAsText(input.files[0], 'UTF-8');
  });
}

async function processarRelatorioBot(clienteId) {
  const btn = document.querySelector('#modal-body .btn-sm:last-of-type');
  if (btn) { btn.textContent = '⏳ PROCESSANDO...'; btn.disabled = true; }
  const preview = document.getElementById('csv-preview');

  try {
    const [estat, ops, ordens] = await Promise.all([
      _lerCSV('csv-estat'), _lerCSV('csv-ops'), _lerCSV('csv-ordens'),
    ]);
    if (!estat.length && !ops.length) {
      showToast('Selecione pelo menos os CSVs de estatísticas e operações.', true); return;
    }

    const estatObj = {};
    estat.forEach(row => {
      const chave = (row['Métrica'] || row['metrica'] || '').trim();
      const valor = (row['Valor']   || row['valor']   || '').trim();
      if (chave) estatObj[chave] = valor;
    });

    const nomeBot = ops[0]?.['Nome do Bot'] || ordens[0]?.['Nome do Bot'] || 'Bot';
    const operacoesLimpas = ops.map(op => ({
      data:       op['Data da Aposta'] || '',
      evento:     op['Nome do Evento'] || '',
      mercado:    op['Nome do Mercado'] || '',
      competicao: op['Nome da Competição'] || '',
      pl:         parseFloat(op['PL']) || 0,
      netPl:      parseFloat(op['netPl']) || 0,
      stake:      parseFloat(op['stake']) || 0,
      banca:      parseFloat(op['Banca do Bot']) || 0,
      placar:     `${op['Placar Final Casa'] ?? ''} x ${op['Placar Final Visitante'] ?? ''}`,
      resultado:  parseFloat(op['PL']) >= 0 ? 'green' : 'red',
    })).sort((a, b) => new Date(a.data) - new Date(b.data));

    const lucroTotal   = operacoesLimpas.reduce((s, o) => s + o.netPl, 0);
    const greens       = operacoesLimpas.filter(o => o.resultado === 'green').length;
    const totalOps     = operacoesLimpas.length;
    const winRate      = totalOps ? ((greens / totalOps) * 100).toFixed(1) + '%' : '0%';
    const bancaInicial = parseFloat(estatObj['Banca'] || operacoesLimpas[0]?.banca || 0);
    const roi          = estatObj['ROI'] || (bancaInicial ? ((lucroTotal / bancaInicial) * 100).toFixed(2) + '%' : '0%');

    const estatFinal = {
      'Taxa de Acerto':  estatObj['Taxa de Acerto'] || winRate,
      'ROI':             roi,
      'Yield':           estatObj['Yield'] || '—',
      'Max Drawdown':    estatObj['Max Drawdown'] || '—',
      'Lucro Total':     estatObj['Lucro Total'] || lucroTotal.toFixed(2),
      'Greens':          estatObj['Quantidade de Greens'] || greens,
      'Reds':            estatObj['Quantidade de Reds'] || (totalOps - greens),
      'Banca':           estatObj['Banca'] || bancaInicial,
      'Total Operações': totalOps,
    };

    await sb.deleteWhere('bot_relatorios', { cliente_id: clienteId, nome_bot: nomeBot }).catch(() => {});
    await sb.insert('bot_relatorios', {
      cliente_id: clienteId, nome_bot: nomeBot,
      estatisticas: estatFinal, operacoes: operacoesLimpas,
    });

    await sb.update('clientes', clienteId, {
      roi: parseFloat(roi) || 0, lucro: lucroTotal, ops: totalOps,
    });

    if (preview) {
      preview.style.display = 'block';
      preview.innerHTML = `✓ Processado! ${totalOps} operações · ROI ${roi} · Win Rate ${estatFinal['Taxa de Acerto']} · Lucro R$${lucroTotal.toFixed(2)}`;
    }
    showToast(`✓ Relatório de ${nomeBot} salvo com sucesso!`);
  } catch (e) {
    console.error('[processarRelatorioBot]', e);
    showToast('Erro ao processar CSV. Verifique os arquivos.', true);
  } finally {
    if (btn) { btn.textContent = '📊 PROCESSAR E SALVAR RELATÓRIO'; btn.disabled = false; }
  }
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
    const senhaHash = await sha256(senha);
    await sb.insert('clientes', {
      email, senha: senhaHash, nome, whats, plano, banca: 0,
      bf_login: '', bf_senha: '', status: 'Pendente',
      bot_ativo: false, bot_e1: false, bot_e2: false, bot_e3: false,
      roi: 0, lucro: 0, ops: 0,
      vencimento: plano ? calcVencimento(plano) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    showToast(`✓ Cliente criado! Senha: ${senha}`);
    const navClientes = [...document.querySelectorAll('#appAdmin .nav-item')]
      .find(n => n.textContent.includes('Clientes'));
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
   TIPS — PAINEL ADMIN
════════════════════════════════════════════════ */
async function renderAdminTips() {
  const main = document.getElementById('adminMain');
  main.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div>Carregando...</div>';

  const tips = await getTips();

  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">
        TIPS <span style="font-size:1rem;color:var(--muted)">(${tips.length})</span>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="abrirModalNovaTip()">✏️ NOVA TIP</button>
        <button class="btn btn-sm" onclick="abrirModalUploadTips()">📂 UPLOAD CSV</button>
      </div>
    </div>

    ${tips.length === 0 ? `
    <div class="panel">
      <div class="empty"><div class="empty-icon">📡</div>Nenhuma tip cadastrada ainda.<br>As tips chegam automaticamente via bot do Telegram.</div>
    </div>` : `
    <div class="panel">
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Evento</th><th>Mercado</th><th>Seleção</th><th>Odd</th><th>Resultado</th><th>P&L/unit</th><th></th></tr>
          </thead>
          <tbody>
            ${tips.sort((a,b) => new Date(b.data) - new Date(a.data)).map(t => `
              <tr>
                <td style="font-family:'IBM Plex Mono',monospace;font-size:.62rem">
                  ${new Date(t.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'})}
                </td>
                <td style="font-size:.7rem;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.evento||'—')}</td>
                <td style="font-size:.65rem;color:var(--muted)">${esc(t.mercado||'—')}</td>
                <td style="font-size:.65rem">${esc(t.selecao||'—')}</td>
                <td style="font-family:'IBM Plex Mono',monospace;color:var(--blue)">${t.odd||'—'}</td>
                <td>
                  ${t.resultado === 'Win'   || t.resultado === 'green'
                    ? '<span style="color:var(--green);font-family:\'IBM Plex Mono\',monospace;font-size:.65rem">● WIN</span>'
                    : t.resultado === 'Loss' || t.resultado === 'red'
                      ? '<span style="color:var(--red);font-family:\'IBM Plex Mono\',monospace;font-size:.65rem">● LOSS</span>'
                      : t.resultado === 'void'
                        ? '<span style="color:var(--muted);font-family:\'IBM Plex Mono\',monospace;font-size:.65rem">● VOID</span>'
                        : '<span style="color:var(--yellow);font-family:\'IBM Plex Mono\',monospace;font-size:.65rem">⏳ ABERTA</span>'}
                </td>
                <td style="font-family:'IBM Plex Mono',monospace;color:${(t.pl_stake||0)>=0?'var(--green)':'var(--red)'}">
                  ${(t.pl_stake||0)>=0?'+':''}${(t.pl_stake||0).toFixed(2)}u
                </td>
                <td>
                  <button class="btn btn-sm" style="padding:.2rem .5rem;font-size:.6rem" onclick="editarTip('${t.id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" style="padding:.2rem .5rem;font-size:.6rem;margin-left:.2rem" onclick="deletarTip('${t.id}')">✕</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`}

    <!-- Modal Nova/Editar Tip -->
    <div class="modal-overlay" id="modalTip" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;align-items:center;justify-content:center">
      <div class="modal" style="position:relative;max-width:480px;width:100%">
        <button class="modal-close" onclick="fecharModalTip()">✕</button>
        <div class="modal-title" id="tip-modal-title">NOVA TIP</div>
        <div id="tip-modal-body"></div>
      </div>
    </div>

    <!-- Modal Upload CSV -->
    <div class="modal-overlay" id="modalUploadTips" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;align-items:center;justify-content:center">
      <div class="modal" style="position:relative;max-width:460px;width:100%">
        <button class="modal-close" onclick="fecharModalUploadTips()">✕</button>
        <div class="modal-title">UPLOAD CSV DE TIPS</div>
        <div style="font-size:.72rem;color:var(--muted2);margin-bottom:1rem;line-height:1.6">
          O CSV deve ter as colunas: <strong style="color:var(--green)">data, evento, mercado, selecao, odd, resultado</strong><br>
          Resultado: <code>Win</code>, <code>Loss</code> ou <code>void</code>
        </div>
        <div class="field"><label>Arquivo CSV</label><input type="file" id="csv-tips" accept=".csv" style="font-size:.65rem;color:var(--muted2)"></div>
        <div id="upload-tips-preview" style="display:none;font-family:'IBM Plex Mono',monospace;font-size:.62rem;color:var(--green);margin:.5rem 0;padding:.5rem;background:rgba(0,229,160,.06);border-radius:6px"></div>
        <button class="btn" style="width:100%;margin-top:.5rem" onclick="processarUploadTips()">📂 IMPORTAR TIPS</button>
      </div>
    </div>
  `;
}

function _formTip(t = {}) {
  const resultado = t.resultado || 'aberta';
  return `
    <div class="field"><label>Data</label>
      <input type="datetime-local" id="tip-data"
        value="${t.data ? new Date(t.data).toISOString().slice(0,16) : new Date().toISOString().slice(0,16)}">
    </div>
    <div class="field-row">
      <div class="field"><label>Evento</label><input type="text" id="tip-evento" value="${esc(t.evento||'')}" placeholder="Time A vs Time B"></div>
      <div class="field"><label>Mercado</label><input type="text" id="tip-mercado" value="${esc(t.mercado||'')}" placeholder="Match Odds"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Seleção</label><input type="text" id="tip-selecao" value="${esc(t.selecao||'')}" placeholder="Back Casa"></div>
      <div class="field"><label>Odd</label><input type="number" id="tip-odd" value="${t.odd||''}" step="0.01" placeholder="1.85"></div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Resultado</label>
        <select id="tip-resultado">
          <option value="aberta"  ${resultado==='aberta'                        ?'selected':''}>⏳ Aberta</option>
          <option value="Win"     ${resultado==='Win'  ||resultado==='green'    ?'selected':''}>● Win</option>
          <option value="Loss"    ${resultado==='Loss' ||resultado==='red'      ?'selected':''}>● Loss</option>
          <option value="void"    ${resultado==='void'                          ?'selected':''}>● Void</option>
        </select>
      </div>
      <div class="field"><label>P&L por unidade</label><input type="number" id="tip-pl" value="${t.pl_stake??''}" step="0.01" placeholder="auto (odd-1 ou -1)"></div>
    </div>
    <div class="field"><label>Observação</label><input type="text" id="tip-obs" value="${esc(t.observacao||'')}" placeholder="Opcional..."></div>
    <div class="err" id="tip-err"></div>
  `;
}

function abrirModalNovaTip() {
  document.getElementById('tip-modal-title').textContent = 'NOVA TIP';
  document.getElementById('tip-modal-body').innerHTML = _formTip() +
    `<button class="btn" style="width:100%;margin-top:.5rem" onclick="salvarTip(null)">💾 SALVAR TIP</button>`;
  document.getElementById('modalTip').style.display = 'flex';
}

async function editarTip(id) {
  const tips = await getTips();
  const t    = tips.find(x => String(x.id) === String(id));
  if (!t) return;
  document.getElementById('tip-modal-title').textContent = 'EDITAR TIP';
  document.getElementById('tip-modal-body').innerHTML = _formTip(t) +
    `<button class="btn" style="width:100%;margin-top:.5rem" onclick="salvarTip('${id}')">💾 SALVAR ALTERAÇÕES</button>`;
  document.getElementById('modalTip').style.display = 'flex';
}

async function salvarTip(id) {
  const resultado = document.getElementById('tip-resultado').value;
  const odd       = parseFloat(document.getElementById('tip-odd').value) || 0;
  const plInput   = document.getElementById('tip-pl').value;
  const pl        = plInput !== ''
    ? parseFloat(plInput)
    : (resultado === 'Win' || resultado === 'green'
        ? odd - 1
        : (resultado === 'Loss' || resultado === 'red' ? -1 : 0));

  const data = {
    data:       new Date(document.getElementById('tip-data').value).toISOString(),
    evento:     document.getElementById('tip-evento').value.trim(),
    mercado:    document.getElementById('tip-mercado').value.trim(),
    selecao:    document.getElementById('tip-selecao').value.trim(),
    odd,
    resultado,
    pl_stake:   pl,
    observacao: document.getElementById('tip-obs').value.trim(),
  };

  const btn = document.querySelector('#modalTip .btn:last-of-type');
  if (btn) { btn.textContent = 'SALVANDO...'; btn.disabled = true; }

  try {
    if (id) await sb.update('tips', id, data);
    else    await sb.insert('tips', data);
    showToast('✓ Tip salva!');
    fecharModalTip();
    renderAdminTips();
  } catch {
    const e = document.getElementById('tip-err');
    if (e) { e.textContent = 'Erro ao salvar.'; e.classList.add('show'); }
  } finally {
    if (btn) { btn.textContent = '💾 SALVAR'; btn.disabled = false; }
  }
}

async function deletarTip(id) {
  if (!confirm('Remover esta tip? Isso remove também os registros dos clientes.')) return;
  try {
    await sb.delete('tips', id);
    showToast('Tip removida.');
    renderAdminTips();
  } catch { showToast('Erro ao remover.', true); }
}

function fecharModalTip()        { const m = document.getElementById('modalTip');        if (m) m.style.display = 'none'; }
function abrirModalUploadTips()  { const m = document.getElementById('modalUploadTips'); if (m) m.style.display = 'flex'; }
function fecharModalUploadTips() { const m = document.getElementById('modalUploadTips'); if (m) m.style.display = 'none'; }

async function processarUploadTips() {
  const input = document.getElementById('csv-tips');
  if (!input?.files?.length) { showToast('Selecione um arquivo CSV.', true); return; }

  const btn = document.querySelector('#modalUploadTips .btn:last-of-type');
  if (btn) { btn.textContent = '⏳ IMPORTANDO...'; btn.disabled = true; }

  try {
    const rows = await new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(_parseCSV(e.target.result));
      r.readAsText(input.files[0], 'UTF-8');
    });

    let importadas = 0;
    for (const row of rows) {
      const resultado = (row['resultado'] || row['Resultado'] || 'aberta').trim();
      const odd       = parseFloat(row['odd'] || row['Odd'] || 0);
      const isWin     = resultado.toLowerCase() === 'win' || resultado.toLowerCase() === 'green';
      const isLoss    = resultado.toLowerCase() === 'loss' || resultado.toLowerCase() === 'red';
      const pl        = isWin ? odd - 1 : isLoss ? -1 : 0;

      await sb.insert('tips', {
        data:       new Date(row['data'] || row['Data'] || Date.now()).toISOString(),
        evento:     row['evento']  || row['Evento']  || row['Nome do Evento'] || '',
        mercado:    row['mercado'] || row['Mercado'] || row['Nome do Mercado'] || '',
        selecao:    row['selecao'] || row['Seleção'] || row['selecão'] || '',
        odd,
        resultado:  isWin ? 'Win' : isLoss ? 'Loss' : resultado,
        pl_stake:   pl,
        observacao: row['observacao'] || row['Observação'] || '',
      });
      importadas++;
    }

    const prev = document.getElementById('upload-tips-preview');
    if (prev) { prev.style.display = 'block'; prev.textContent = `✓ ${importadas} tips importadas!`; }
    showToast(`✓ ${importadas} tips importadas!`);
    fecharModalUploadTips();
    renderAdminTips();
  } catch(e) {
    console.error(e);
    showToast('Erro ao importar CSV.', true);
  } finally {
    if (btn) { btn.textContent = '📂 IMPORTAR TIPS'; btn.disabled = false; }
  }
}

/* ── Dashboard Tips de um cliente (visto pelo admin) ── */
async function verDashboardTipsCliente(clienteId, nomeCliente) {
  const [tips, tipsCliente] = await Promise.all([getTips(), getTipsCliente(clienteId)]);
  const mapa       = Object.fromEntries(tipsCliente.map(tc => [String(tc.tip_id), tc]));
  const encerradas = tips
    .filter(t => t.resultado && t.resultado !== 'aberta' && t.resultado !== 'pendente')
    .sort((a,b) => new Date(b.data) - new Date(a.data));

  const pegadas  = encerradas.filter(t => mapa[String(t.id)]?.pegou);
  const lucro    = pegadas.reduce((s,t) => s + (mapa[String(t.id)]?.pl || 0), 0);
  const winRate  = pegadas.length
    ? ((pegadas.filter(t=>(mapa[String(t.id)]?.pl||0)>0).length / pegadas.length)*100).toFixed(1)
    : 0;
  const roiGeral = tips
    .filter(t => t.resultado && t.resultado !== 'aberta' && t.resultado !== 'pendente')
    .reduce((s,t) => s + (t.pl_stake||0), 0);

  document.getElementById('modal-title').textContent = `TIPS — ${nomeCliente}`;
  document.getElementById('modal-body').innerHTML = `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin-bottom:.8rem">// DESEMPENHO DO CLIENTE</div>
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin-bottom:1rem">
      <div class="kpi g" style="padding:.6rem"><div class="kpi-label">Tips Pegas</div><div class="kpi-val g" style="font-size:1.2rem">${pegadas.length}/${encerradas.length}</div></div>
      <div class="kpi g" style="padding:.6rem"><div class="kpi-label">Lucro</div><div class="kpi-val g" style="font-size:1.2rem">${lucro>=0?'+':''}R$${lucro.toFixed(2)}</div></div>
      <div class="kpi b" style="padding:.6rem"><div class="kpi-label">Win Rate</div><div class="kpi-val b" style="font-size:1.2rem">${winRate}%</div></div>
      <div class="kpi y" style="padding:.6rem"><div class="kpi-label">ROI Canal</div><div class="kpi-val y" style="font-size:1.2rem">${roiGeral>=0?'+':''}${roiGeral.toFixed(2)}u</div></div>
    </div>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin-bottom:.6rem">// TODAS AS TIPS</div>
    <div class="tbl-wrap" style="max-height:300px;overflow-y:auto">
      <table>
        <thead><tr><th>Data</th><th>Evento</th><th>Odd</th><th>Resultado</th><th>Pegou?</th><th>Stake</th><th>P&L</th></tr></thead>
        <tbody>
          ${encerradas.map(t => `
            <tr>
              <td style="font-size:.6rem;font-family:'IBM Plex Mono',monospace">${new Date(t.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</td>
              <td style="font-size:.65rem;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.evento||'—')}</td>
              <td style="font-family:'IBM Plex Mono',monospace;color:var(--blue)">${t.odd}</td>
              <td style="font-size:.62rem;color:${(t.resultado==='Win'||t.resultado==='green')?'var(--green)':'var(--red)'}">
                ${t.resultado?.toUpperCase()}
              </td>
              <td style="font-size:.65rem;color:${mapa[String(t.id)]?.pegou?'var(--green)':'var(--muted)'}">
                ${mapa[String(t.id)]?.pegou ? '✓ SIM' : '— NÃO'}
              </td>
              <td style="font-family:'IBM Plex Mono',monospace;font-size:.65rem">
                ${mapa[String(t.id)]?.stake ? 'R$'+Number(mapa[String(t.id)].stake).toFixed(0) : '—'}
              </td>
              <td style="font-family:'IBM Plex Mono',monospace;font-size:.65rem;color:${(mapa[String(t.id)]?.pl||0)>=0?'var(--green)':'var(--red)'}">
                ${mapa[String(t.id)]?.pegou
                  ? ((mapa[String(t.id)].pl>=0?'+':'')+'R$'+Number(mapa[String(t.id)].pl).toFixed(2))
                  : '—'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <button class="btn btn-ghost" style="margin-top:1rem;width:100%" onclick="closeModal()">FECHAR</button>
  `;
  document.getElementById('modalCliente').classList.add('open');
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
    <div class="panel" style="max-width:500px;margin-top:1rem">
      <div class="panel-title">Bot Telegram</div>
      <div class="info-row"><span class="info-label">Worker URL</span><span class="info-val" style="font-size:.6rem">https://intellect-bot.intellectcopytrading.workers.dev/</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-val" style="color:var(--green)">● Webhook Ativo</span></div>
      <div class="info-row"><span class="info-label">Plano Tips</span><span class="info-val" style="color:var(--blue)">Tips automáticas via app</span></div>
    </div>
  `;
}
