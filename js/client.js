/* ════════════════════════════════════════════════
   js/client.js — Dashboard e abas do cliente
════════════════════════════════════════════════ */

function loadClientDashboard(client) {
  State.client = client;
  const nameEl = document.getElementById('topbar-name');
  if (nameEl) nameEl.textContent = client.nome ? client.nome.split(' ')[0] : client.email.split('@')[0];
  show('appClient');
  renderClientDashboard();
}

function clientTab(tab, el) {
  if (!el) return;
  document.querySelectorAll('#appClient .nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#mobileNav .mobile-nav-item[data-tab]').forEach(n => {
    n.classList.toggle('active', n.dataset.tab === tab);
  });
  _renderTab(tab);
}

function clientTabMobile(tab, el) {
  document.querySelectorAll('#mobileNav .mobile-nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#appClient .nav-item[data-tab]').forEach(n => {
    n.classList.toggle('active', n.dataset.tab === tab);
  });
  _renderTab(tab);
}

function _renderTab(tab) {
  const map = {
    dashboard:   renderClientDashboard,
    estrategias: renderClientEstrategias,
    operacoes:   renderClientOps,
    conta:       renderClientConta,
    planos:      renderClientPlanos,
  };
  map[tab]?.();
}

function renderClientDashboard() {
  const c = State.client;
  const vc = new Date(c.vencimento);
  const diasRestantes = Math.max(0, Math.round((vc - Date.now()) / 86_400_000));

  const statusBadge = c.botAtivo
    ? `<span class="badge active-badge"><span class="badge-dot pulse"></span>BOT ATIVO</span>`
    : c.status === 'Pendente'
      ? `<span class="badge pending-badge"><span class="badge-dot"></span>AGUARDANDO CONFIG.</span>`
      : `<span class="badge inactive-badge"><span class="badge-dot"></span>BOT INATIVO</span>`;

  const hist = c.historico.length > 0 ? c.historico : _gerarHistoricoDemo(c);
  const isTel = c.plano?.includes('Telegram');
  const incompleto = !c.nome || !c.whats || !c.plano || (!isTel && !c.bfLogin);

  document.getElementById('clientMain').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
      <div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">MEU DASHBOARD</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.62rem;color:var(--muted)">${esc(c.plano)}</div>
      </div>
      ${statusBadge}
    </div>

    ${incompleto ? `
    <div style="background:rgba(255,194,51,.07);border:1px solid rgba(255,194,51,.2);border-radius:10px;padding:1rem 1.3rem;font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--yellow)">
      ⚠️ Cadastro incompleto — preencha seus dados para ativar os bots.
      <span style="color:var(--green);cursor:pointer;text-decoration:underline"
            onclick="clientTab('conta', document.querySelector('#appClient .nav-item[data-tab=\\'conta\\']'))">
        Completar agora →
      </span>
    </div>` : ''}

    <div class="kpi-grid">
      <div class="kpi g">
        <div class="kpi-label">ROI no Período</div>
        <div class="kpi-val g">${c.roi >= 0 ? '+' : ''}${c.roi.toFixed(1)}%</div>
        <div class="kpi-sub">desde o início</div>
      </div>
      <div class="kpi g">
        <div class="kpi-label">Lucro em R$</div>
        <div class="kpi-val g">${c.lucro >= 0 ? '+' : ''}R$${c.lucro.toFixed(0)}</div>
        <div class="kpi-sub">banca inicial: R$${Number(c.banca).toLocaleString('pt-BR')}</div>
      </div>
      <div class="kpi b">
        <div class="kpi-label">Operações</div>
        <div class="kpi-val b">${c.ops}</div>
        <div class="kpi-sub">registradas no período</div>
      </div>
      <div class="kpi ${diasRestantes <= 7 ? 'r' : 'y'}">
        <div class="kpi-label">Vencimento do Plano</div>
        <div class="kpi-val ${diasRestantes <= 7 ? 'r' : 'y'}">${diasRestantes}d</div>
        <div class="kpi-sub">${vc.toLocaleDateString('pt-BR')}</div>
      </div>
    </div>

    <div class="panels-row">
      <div class="panel">
        <div class="panel-title">Evolução da Banca (R$)</div>
        <div class="chart-wrap"><canvas id="clientChart"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-title">Resumo da Conta</div>
        <div class="info-row"><span class="info-label">Plano</span><span class="info-val">${esc(c.plano ? c.plano.split(' ·')[0] : '—')}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-val">${esc(c.status)}</span></div>
        <div class="info-row"><span class="info-label">Banca Inicial</span><span class="info-val">R$${Number(c.banca).toLocaleString('pt-BR')}</span></div>
        <div class="info-row"><span class="info-label">Banca Atual</span><span class="info-val" style="color:var(--green)">R$${(Number(c.banca) + c.lucro).toLocaleString('pt-BR')}</span></div>
        <div class="info-row"><span class="info-label">Cadastro</span><span class="info-val">${new Date(c.cadastro).toLocaleDateString('pt-BR')}</span></div>
        <div class="info-row"><span class="info-label">Vencimento</span><span class="info-val">${vc.toLocaleDateString('pt-BR')}</span></div>
      </div>
    </div>

    ${diasRestantes <= 7 ? `
    <div style="background:rgba(255,69,96,.07);border:1px solid rgba(255,69,96,.2);border-radius:10px;padding:1rem 1.3rem;font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--red)">
      ⚠️ Seu plano vence em <strong>${diasRestantes} dias</strong>. Entre em contato para renovar.
      <button class="btn btn-sm btn-danger" style="margin-top:.7rem" onclick="openWpp()">RENOVAR AGORA</button>
    </div>` : ''}
  `;

  _renderChart(hist);
}

function _renderChart(hist) {
  State.destroyChart();
  const ctx = document.getElementById('clientChart')?.getContext('2d');
  if (!ctx) return;
  State.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hist.map(h => h.data),
      datasets: [{
        data: hist.map(h => h.banca),
        borderColor: '#00e5a0',
        backgroundColor: 'rgba(0,229,160,.08)',
        borderWidth: 2, pointRadius: 2, tension: 0.4, fill: true,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1520', borderColor: '#1e2f42', borderWidth: 1,
          titleColor: '#6a90b0', bodyColor: '#00e5a0',
          titleFont: { family: 'IBM Plex Mono', size: 10 },
          bodyFont:  { family: 'IBM Plex Mono', size: 11 },
          callbacks: { label: ctx => ` R$ ${ctx.parsed.y.toFixed(0)}` },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(22,32,48,.8)' }, ticks: { color: '#4a7090', font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 6 } },
        y: { grid: { color: 'rgba(22,32,48,.8)' }, ticks: { color: '#4a7090', font: { family: 'IBM Plex Mono', size: 9 }, callback: v => 'R$' + v } },
      },
    },
  });
}

function _gerarHistoricoDemo(c) {
  const pts = 30;
  const bancaInicial = Number(c.banca) || 1000;
  const lucroTotal   = c.lucro || 0;
  return Array.from({ length: pts }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (pts - i));
    const progresso = pts > 1 ? i / (pts - 1) : 1;
    const variacao  = (Math.random() - 0.45) * Math.abs(lucroTotal) * 0.08;
    const banca     = bancaInicial + (lucroTotal * progresso) + variacao;
    return {
      data:  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      banca: parseFloat(Math.max(0, banca).toFixed(2)),
    };
  });
}

function renderClientOps() {
  const c = State.client;
  const tableRows = c.historico.map(h => `
    <tr>
      <td>${esc(h.data)}</td>
      <td style="font-family:'IBM Plex Mono',monospace">R$${h.banca?.toFixed(0) || '—'}</td>
      <td style="color:${(h.lucro || 0) >= 0 ? 'var(--green)' : 'var(--red)'};font-family:'IBM Plex Mono',monospace">
        ${(h.lucro || 0) >= 0 ? '+' : ''}R$${(h.lucro || 0).toFixed(2)}
      </td>
      <td style="color:var(--blue);font-family:'IBM Plex Mono',monospace">${(h.roi || 0).toFixed(1)}%</td>
    </tr>`).join('');

  document.getElementById('clientMain').innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">OPERAÇÕES</div>
    ${c.historico.length === 0 ? `
      <div class="panel">
        <div class="empty"><div class="empty-icon">📋</div>Nenhuma operação registrada ainda.<br>Aguarde a configuração dos bots.</div>
      </div>` : `
      <div class="panel">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Data</th><th>Banca</th><th>Lucro</th><th>ROI</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`}
  `;
}

function renderClientEstrategias() {
  const c = State.client;
  const temAcesso = c.plano && (c.plano.includes('Anual') || c.plano.includes('Bot'));

  const cards = ESTRATEGIAS.map(e => `
    <div class="panel" style="border-color:${temAcesso && c.botAtivo ? 'var(--green)' : 'var(--border)'}">
      <div style="font-size:2rem;margin-bottom:.6rem">${e.icone}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:2px;color:var(--muted);margin-bottom:.3rem">${esc(e.mercado)}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:2px;margin-bottom:.5rem">${esc(e.nome)}</div>
      <div style="font-size:.78rem;color:var(--muted2);margin-bottom:1rem;line-height:1.6">${esc(e.desc)}</div>
      ${temAcesso
        ? `<span class="badge ${c.botAtivo ? 'active-badge' : 'pending-badge'}">
             <span class="badge-dot ${c.botAtivo ? 'pulse' : ''}"></span>
             ${c.botAtivo ? 'ATIVO' : 'AGUARDANDO CONFIG.'}
           </span>`
        : `<button class="btn btn-sm"
             onclick="clientTab('planos', document.querySelector('#appClient .nav-item[data-tab=\\'planos\\']'))">
             CONTRATAR →
           </button>`}
    </div>`).join('');

  document.getElementById('clientMain').innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">ESTRATÉGIAS</div>
    <p style="font-size:.8rem;color:var(--muted2);margin-bottom:1rem">Bots automatizados operando 24/7 na sua conta Betfair.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem">${cards}</div>
    ${!temAcesso ? `
    <div style="background:rgba(255,194,51,.06);border:1px solid rgba(255,194,51,.15);border-radius:10px;padding:1rem 1.2rem;font-family:'IBM Plex Mono',monospace;font-size:.68rem;color:var(--yellow)">
      ⚡ Você precisa de um plano Bot ou Anual para ativar as estratégias.
      <span style="color:var(--green);cursor:pointer;text-decoration:underline"
            onclick="clientTab('planos', document.querySelector('#appClient .nav-item[data-tab=\\'planos\\']'))">
        Ver planos →
      </span>
    </div>` : ''}
  `;
}

function renderClientConta() {
  const c = State.client;
  const isTelegram = c.plano?.includes('Telegram');
  const incompleto = !c.nome || !c.whats || !c.plano || (!isTelegram && !c.bfLogin);

  document.getElementById('clientMain').innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">MINHA CONTA</div>

    ${incompleto ? `
    <div style="background:rgba(255,194,51,.07);border:1px solid rgba(255,194,51,.2);border-radius:10px;padding:1rem 1.3rem;font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--yellow)">
      ⚠️ Complete seu cadastro abaixo para ativar os bots.
    </div>` : ''}

    <div class="panel" style="max-width:540px">
      <div class="panel-title">Dados Pessoais</div>
      <div class="field"><label>Nome Completo</label><input type="text" id="p-nome" value="${esc(c.nome)}" placeholder="Seu nome completo"></div>
      <div class="field"><label>WhatsApp</label><input type="text" id="p-whats" value="${esc(c.whats)}" placeholder="(00) 00000-0000"></div>
      <div class="field">
        <label>Plano Desejado</label>
        <select id="p-plano" onchange="toggleBetfairCliente()">
          <option value="">Selecione seu plano...</option>
          ${buildPlanosOptions(c.plano)}
        </select>
      </div>
      <div id="p-banca-wrap" ${isTelegram ? 'style="display:none"' : ''}>
        <div class="field"><label>Banca Inicial na Betfair (R$)</label><input type="number" id="p-banca" value="${c.banca || ''}" placeholder="Ex: 5000"></div>
      </div>
    </div>

    <div id="p-betfair-wrap" class="panel" style="max-width:540px${isTelegram ? ';display:none' : ''}">
      <div class="panel-title">🔑 Acesso Betfair</div>
      <div class="sec-notice">🔒 Seus dados são acessados apenas pela nossa equipe para configurar os bots.</div>
      <div class="field"><label>Login / Email Betfair</label><input type="email" id="p-bfl" value="${esc(c.bfLogin)}" placeholder="email@betfair.com"></div>
      <div class="field"><label>Senha Betfair</label><input type="password" id="p-bfs" value="${esc(c.bfSenha)}" placeholder="••••••••"></div>
    </div>

    <div class="panel" style="max-width:540px">
      <div class="panel-title">Segurança</div>
      <div class="field"><label>Email da Conta</label><input type="text" value="${esc(c.email)}" disabled style="opacity:.5"></div>
      <div class="field"><label>Nova Senha (deixe em branco para manter)</label><input type="password" id="p-newsenha" placeholder="••••••••"></div>
    </div>

    <div style="max-width:540px">
      <div class="err" id="p-err"></div>
      <button class="btn" onclick="saveProfile()">💾 SALVAR CADASTRO →</button>
      <button class="btn btn-ghost" style="margin-top:.5rem" onclick="openWpp()">💬 FALAR COM SUPORTE</button>
    </div>
  `;
}

function toggleBetfairCliente() {
  const isTelegram = document.getElementById('p-plano').value.includes('Telegram');
  document.getElementById('p-banca-wrap').style.display   = isTelegram ? 'none' : '';
  document.getElementById('p-betfair-wrap').style.display = isTelegram ? 'none' : '';
}

async function saveProfile() {
  const nome      = document.getElementById('p-nome').value.trim();
  const whats     = document.getElementById('p-whats').value.trim();
  const plano     = document.getElementById('p-plano').value;
  const isTelegram= plano.includes('Telegram');
  const banca     = isTelegram ? 0 : parseFloat(document.getElementById('p-banca').value);
  const bfLogin   = isTelegram ? '' : document.getElementById('p-bfl').value.trim();
  const bfSenha   = isTelegram ? '' : document.getElementById('p-bfs').value;
  const newSenha  = document.getElementById('p-newsenha').value;
  const errEl     = document.getElementById('p-err');
  errEl.classList.remove('show');

  const validations = [
    [!nome || !whats || !plano,                      'Preencha todos os campos obrigatórios.'],
    [!isTelegram && (isNaN(banca) || !bfLogin || !bfSenha), 'Preencha banca e dados da Betfair.'],
    [!isTelegram && banca < 0,                       'Banca não pode ser negativa.'],
    [newSenha && newSenha.length < 6,                'Nova senha mínima de 6 caracteres.'],
  ];
  for (const [cond, msg] of validations) {
    if (cond) { errEl.textContent = msg; errEl.classList.add('show'); return; }
  }

  const btn = document.querySelector('#clientMain .btn');
  if (btn) { btn.textContent = 'SALVANDO...'; btn.disabled = true; }

  const patch = { nome, whats, plano, banca, bf_login: bfLogin, bf_senha: bfSenha };
  if (newSenha) patch.senha = newSenha;

  try {
    const result  = await sb.update('clientes', State.client.id, patch);
    const updated = Array.isArray(result) ? result[0] : result;
    if (!updated) throw new Error('Nenhum registro atualizado.');

    const savedHist = State.client.historico;
    State.client = { ...State.client, ...mapClient(updated), historico: savedHist };

    const nameEl = document.getElementById('topbar-name');
    if (nameEl) nameEl.textContent = nome.split(' ')[0] || State.client.email.split('@')[0];

    document.getElementById('p-newsenha').value = '';
    showToast('✓ Cadastro salvo! Nossa equipe irá configurar seus bots em breve.');
  } catch {
    errEl.textContent = 'Erro ao salvar. Tente novamente.';
    errEl.classList.add('show');
  } finally {
    if (btn) { btn.textContent = '💾 SALVAR CADASTRO →'; btn.disabled = false; }
  }
}

function renderClientPlanos() {
  const c = State.client;
  const planoAtual = c.plano || '';

  function planCard(opts) {
    const ativo  = opts.ativo;
    const border = ativo ? opts.borderAtivo : (opts.border || 'var(--border)');
    const shadow = ativo ? (opts.shadowAtivo || '') : '';
    return `
      <div class="panel" style="border-color:${border};${shadow}">
        ${ativo ? `<div style="text-align:center;margin-bottom:.8rem">
          <span style="background:var(--green);color:#060910;font-family:'IBM Plex Mono',monospace;font-size:.55rem;font-weight:700;padding:.2rem .8rem;border-radius:20px;letter-spacing:1px">PLANO ATUAL</span>
        </div>` : ''}
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.58rem;letter-spacing:3px;color:var(--muted);margin-bottom:.5rem">${opts.tag}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;margin-bottom:.3rem">${opts.nome}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:${opts.cor};line-height:1">${opts.preco}<span style="font-size:1rem;color:var(--muted2)">${opts.periodo}</span></div>
        <div style="font-size:.65rem;color:var(--muted);margin-bottom:1.2rem">${opts.sub}</div>
        <div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:1.5rem;font-size:.75rem;color:var(--muted2)">
          ${opts.items.map(i => `<div>✓ ${i}</div>`).join('')}
        </div>
        ${ativo
          ? `<div class="btn btn-ghost" style="text-align:center;cursor:default">PLANO ATIVO ✓</div>`
          : `<button class="btn" style="${opts.btnStyle || ''}"
               data-plano-nome="${esc(opts._nomeModal || '')}"
               data-plano-valor="${opts._valor || 0}"
               data-plano-desc="${esc(opts._desc || '')}"
               onclick="abrirModalPlano(this.dataset.planoNome, Number(this.dataset.planoValor), this.dataset.planoDesc)">
               ${opts.btnLabel}
             </button>`}
      </div>`;
  }

  document.getElementById('clientMain').innerHTML = `
    <div style="max-width:860px;margin:0 auto">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;letter-spacing:3px;color:var(--muted);margin-bottom:.3rem">// ESCOLHA SEU PLANO</div>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:2px;margin-bottom:.4rem">PLANOS E PREÇOS</h2>
      <p style="font-size:.8rem;color:var(--muted2);margin-bottom:2rem">Taxa de performance cobrada <strong style="color:var(--green)">apenas quando houver lucro</strong>.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.2rem">
        ${planCard({
          ativo: planoAtual.includes('Telegram'),
          border: 'var(--border)', borderAtivo: 'var(--green)', shadowAtivo: 'box-shadow:0 0 20px rgba(0,229,160,.15)',
          tag: 'SINAIS', nome: 'PLANO TELEGRAM', preco: 'R$ 97', periodo: '/mês', cor: 'var(--green)', sub: 'sem taxa de performance',
          items: ['Sinais diários no grupo privado','Todas as estratégias validadas','Execute manualmente ou automatize','Ideal para conhecer o método'],
          _nomeModal: 'Plano Telegram', _valor: 97, _desc: 'Acesso ao grupo privado com sinais diários.',
          btnLabel: 'ASSINAR AGORA →',
        })}
        ${planCard({
          ativo: planoAtual.includes('Bot'),
          border: 'var(--green2)', borderAtivo: 'var(--green2)', shadowAtivo: 'box-shadow:0 0 20px rgba(0,229,160,.15)',
          tag: 'AUTOMAÇÃO', nome: 'BOT POR ESTRATÉGIA', preco: 'R$ 117', periodo: '/estratégia', cor: 'var(--green)', sub: '+ 10% sobre o lucro mensal',
          items: ['Escolha qual estratégia ativar','Over Gols · Under Gols · Match Odds','Controle total pela área do cliente','Sem lucro = sem cobrança mensal'],
          _nomeModal: 'Bot por Estrategia', _valor: 117, _desc: 'Ativação de uma estratégia automatizada na sua conta Betfair.',
          btnLabel: 'CONTRATAR →',
        })}
        ${planCard({
          ativo: planoAtual.includes('Anual'),
          border: 'var(--border)', borderAtivo: 'var(--yellow)', shadowAtivo: 'box-shadow:0 0 20px rgba(255,194,51,.15)',
          tag: 'COPYTRADING COMPLETO', nome: 'PLANO ANUAL', preco: 'R$ 1.997', periodo: '/ano', cor: 'var(--yellow)', sub: '+ 15% sobre o lucro · R$166/mês',
          items: ['Todas as estratégias ativas 24/7','Setup completo incluso','Relatórios semanais no WhatsApp','Suporte especializado vitalício','Acesso a novas estratégias validadas'],
          _nomeModal: 'Plano Anual', _valor: 1997, _desc: 'Todas as estratégias ativas com setup completo incluso.',
          btnLabel: 'ASSINAR AGORA →', btnStyle: 'background:linear-gradient(135deg,#b8860b,var(--yellow));color:#060910',
        })}
      </div>
      <div style="margin-top:1.5rem;background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.1);border-radius:10px;padding:1rem 1.2rem;font-family:'IBM Plex Mono',monospace;font-size:.62rem;color:var(--muted);line-height:1.8">
        💳 Pagamento via PIX · Ativação em até 24h úteis &nbsp;·&nbsp; ⚡ Sem lucro = sem cobrança &nbsp;·&nbsp; 📋 Dúvidas?
        <a href="https://wa.me/${CONFIG.WPP_ADMIN}" target="_blank" style="color:var(--green)">Fale no WhatsApp</a>
      </div>
    </div>
  `;
}

function abrirModalPlano(nomePlano, valor, descricao) {
  document.getElementById('modal-plano-title').textContent = 'ASSINAR — ' + nomePlano.toUpperCase();
  document.getElementById('modal-plano-body').innerHTML = `
    <div style="background:rgba(0,229,160,.06);border:1px solid rgba(0,229,160,.15);border-radius:10px;padding:1rem 1.2rem;margin-bottom:1.2rem">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.62rem;color:var(--muted);margin-bottom:.3rem">PLANO SELECIONADO</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:var(--green)">${esc(nomePlano)}</div>
      <div style="font-size:.78rem;color:var(--muted2);margin-top:.3rem">${esc(descricao)}</div>
    </div>
    <div style="text-align:center;margin-bottom:1.2rem">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.62rem;color:var(--muted);margin-bottom:.5rem">VALOR A PAGAR</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2.5rem;color:var(--green)">R$ ${valor.toLocaleString('pt-BR')}</div>
      <div style="font-size:.7rem;color:var(--muted)">pagamento único via PIX</div>
    </div>
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:1.2rem;margin-bottom:1.2rem;text-align:center">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.6rem;color:var(--muted);margin-bottom:.5rem">CHAVE PIX</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:.75rem;word-break:break-all;margin-bottom:.8rem">${esc(CONFIG.PIX_KEY)}</div>
      <button class="btn btn-sm" onclick="copiarPix()">📋 COPIAR CHAVE PIX</button>
    </div>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:.65rem;color:var(--muted);line-height:2;margin-bottom:1.2rem">
      ① Faça o PIX para a chave acima<br>
      ② Envie o comprovante pelo WhatsApp<br>
      ③ Ativação em até 24h úteis
    </div>
    <button class="btn" data-plano="${esc(nomePlano)}" onclick="confirmarPagamentoWpp(this.dataset.plano, ${valor})">
      💬 ENVIAR COMPROVANTE NO WHATSAPP →
    </button>
  `;
  document.getElementById('modalPagamentoPlano').classList.add('open');
}

function fecharModalPlano() {
  document.getElementById('modalPagamentoPlano').classList.remove('open');
}

function copiarPix() {
  navigator.clipboard.writeText(CONFIG.PIX_KEY)
    .then(() => showToast('✓ Chave PIX copiada!'))
    .catch(() => showToast('Copie: ' + CONFIG.PIX_KEY, true));
}

function confirmarPagamentoWpp(nomePlano, valor) {
  const nome = State.client ? (State.client.nome || State.client.email) : '';
  const msg  = encodeURIComponent(`Olá Matheus! Sou ${nome} e fiz o PIX de R$${valor} para o ${nomePlano}. Segue o comprovante:`);
  window.open(`https://wa.me/${CONFIG.WPP_ADMIN}?text=${msg}`, '_blank');
  fecharModalPlano();
}
