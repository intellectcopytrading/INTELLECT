// ============================================================
// INTELLECT COPYTRADING — Cloudflare Worker
// Versão com Tips Automáticas (estrutura corrigida)
// ============================================================

const SUPABASE_URL = "https://refmtoahyxldnyejwkwt.supabase.co";

// ── helper ─────────────────────────────────────────────────

async function sb(method, path, body, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

// ── parsers ────────────────────────────────────────────────

function parseOrdem(text) {
  const estrategiaMatch = text.match(/\[Estrat[ée]gia\s*(\d+)\]/i);
  const estrategia_id = estrategiaMatch ? parseInt(estrategiaMatch[1]) : null;
  const estrategia = estrategiaMatch ? `Estratégia ${estrategia_id}` : null;

  const linhaOrdem = text.match(/Coloca[çc][aã]o da Ordem:\s*(.+?)Odd:/s);
  const infoRaw = linhaOrdem ? linhaOrdem[1].trim() : "";

  const partes = infoRaw.split(" - ");
  const eventoRaw = partes.length > 1 ? partes[partes.length - 1].trim() : infoRaw;

  const mercadoMatch = infoRaw.match(/^(.+?)\s*\(/);
  const mercado = mercadoMatch ? mercadoMatch[1].trim() : null;

  const oddMatch = text.match(/Odd:\s*([\d.]+)/);
  const odd = oddMatch ? parseFloat(oddMatch[1]) : null;

  const stakeMatch = text.match(/Responsabilidade:\s*R\$\s*([\d.,]+)/);
  const stake_base = stakeMatch ? parseFloat(stakeMatch[1].replace(",", ".")) : null;

  return { evento: eventoRaw || null, mercado, odd, stake_base, estrategia_id, estrategia };
}

function parseResultado(text) {
  const eventoMatch = text.match(/Resultado da Opera[çc][aã]o:\s*.+?\)\s*(.+?)\s*(Lucro|Loss)/);
  const evento = eventoMatch ? eventoMatch[1].trim() : null;

  const lucroMatch = text.match(/Lucro de R\$([\d.,]+)/);
  const lossMatch = text.match(/Loss/i);
  const resultado = lucroMatch ? "Win" : lossMatch ? "Loss" : null;

  const pl = lucroMatch ? parseFloat(lucroMatch[1].replace(",", ".")) : null;

  const oddMatch = text.match(/Odd:\s*([\d.]+)/);
  const odd = oddMatch ? parseFloat(oddMatch[1]) : null;

  const stakeMatch = text.match(/Responsabilidade:\s*R\$([\d.,]+)/);
  const stake = stakeMatch ? parseFloat(stakeMatch[1].replace(",", ".")) : null;

  const pl_stake = pl && stake ? parseFloat((pl / stake).toFixed(4)) : null;

  return { evento, resultado, pl, pl_stake, odd, stake };
}

// ── lógica principal ────────────────────────────────────────

async function handleOrdem(parsed, key) {
  const { evento, mercado, odd, stake_base, estrategia_id, estrategia } = parsed;

  if (!evento) {
    console.log("Ordem ignorada: evento não encontrado", JSON.stringify(parsed));
    return;
  }

  // 1. Salvar operacao
  const [operacao] = await sb("POST", "operacoes", {
    data: new Date().toISOString().split("T")[0],
    estrategia,
    evento,
    stake: stake_base,
    resultado: "aberta",
    origem: "telegram",
  }, key);

  console.log(`Operação salva: ${evento}`);

  // 2. Criar tip
  const [tip] = await sb("POST", "tips", {
    evento,
    mercado,
    odd,
    resultado: "aberta",
    observacao: `Estratégia ${estrategia_id}`,
  }, key);

  console.log(`Tip criada: ${tip.id}`);

  // 3. Mapear estrategia para coluna bot_eX
  const colunaBot = estrategia_id === 1 ? "bot_e1"
                  : estrategia_id === 2 ? "bot_e2"
                  : estrategia_id === 3 ? "bot_e3"
                  : null;

  if (!colunaBot) {
    console.log(`Estratégia ${estrategia_id} sem mapeamento bot_eX — tip criada sem distribuir`);
    return;
  }

  // 4. Buscar clientes ativos com Plano Tips
  const clientes = await sb("GET", `clientes?${colunaBot}=eq.true&status=eq.Ativo&select=id`, null, key);

  if (!clientes || clientes.length === 0) {
    console.log(`Nenhum cliente ativo para ${colunaBot}`);
    return;
  }

  // 5. Criar tips_clientes
  const tipsClientes = clientes.map((c) => ({
    cliente_id: c.id,
    tip_id: tip.id,
    pegou: false,
    stake: stake_base,
    pl: null,
  }));

  await sb("POST", "tips_clientes", tipsClientes, key);
  console.log(`Tips distribuídas para ${clientes.length} cliente(s) via ${colunaBot}`);
}

async function handleResultado(parsed, key) {
  const { evento, resultado, pl, pl_stake } = parsed;

  if (!evento || !resultado) {
    console.log("Resultado ignorado: dados insuficientes", JSON.stringify(parsed));
    return;
  }

  // 1. Atualiza operacoes
  await sb("PATCH", `operacoes?evento=eq.${encodeURIComponent(evento)}&resultado=eq.aberta`, {
    resultado,
    roi_op: pl_stake,
    lucro_liq: pl,
  }, key);

  // 2. Atualiza tip e busca o id dela
  const tips = await sb("GET", `tips?evento=eq.${encodeURIComponent(evento)}&resultado=eq.aberta&select=id`, null, key);

  if (tips && tips.length > 0) {
    const tipId = tips[0].id;

    await sb("PATCH", `tips?id=eq.${tipId}`, {
      resultado,
      pl_stake,
    }, key);

    // 3. Atualiza pl em tips_clientes para quem pegou
    const tipsClientes = await sb("GET", `tips_clientes?tip_id=eq.${tipId}&pegou=eq.true&select=id,stake`, null, key);

    if (tipsClientes && tipsClientes.length > 0) {
      for (const tc of tipsClientes) {
        const plCliente = parseFloat(((tc.stake || 0) * (pl_stake || 0)).toFixed(2));
        await sb("PATCH", `tips_clientes?id=eq.${tc.id}`, { pl: plCliente }, key);
      }
      console.log(`PL atualizado para ${tipsClientes.length} cliente(s)`);
    }
  }

  console.log(`Resultado atualizado: ${evento} → ${resultado} | PL: R$${pl}`);
}

// ── entry point ─────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const key = env.SUPABASE_SERVICE_KEY;

    if (!key) {
      console.error("SUPABASE_SERVICE_KEY não configurada!");
      return new Response("Config error", { status: 500 });
    }

    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }

    const message =
      body?.message?.text ||
      body?.channel_post?.text ||
      body?.text ||
      "";

    if (!message) {
      return new Response("No message", { status: 200 });
    }

    console.log("Mensagem recebida:", message.substring(0, 100));

    try {
      if (message.includes("Coloca") && message.includes("Ordem")) {
        const parsed = parseOrdem(message);
        await handleOrdem(parsed, key);
      } else if (message.includes("Resultado da Opera")) {
        const parsed = parseResultado(message);
        await handleResultado(parsed, key);
      } else {
        console.log("Mensagem não reconhecida");
      }
    } catch (err) {
      console.error("Erro:", err.message);
      return new Response(`Erro: ${err.message}`, { status: 200 });
    }

    return new Response("OK", { status: 200 });
  },
};
