/* ════════════════════════════════════════════════
   js/config.js — Constantes e configurações globais

   ⚠️  SEGURANÇA:
   A SUPABASE_KEY exposta aqui é a chave anon pública.
   Isso é aceitável SOMENTE se você configurar Row Level
   Security (RLS) no Supabase. Veja README.md.

   NUNCA coloque a service_role key no frontend.
   NUNCA suba a ADMIN_PWD para um repositório público.
════════════════════════════════════════════════ */

const CONFIG = Object.freeze({
  SUPABASE_URL: 'https://refmtoahyxldnyejwkwt.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZm10b2FoeXhsZG55ZWp3a3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5NjgsImV4cCI6MjA4Nzg1NDk2OH0.zJwSQcP5_KMubQhyUvfrmGfPe-Gr-dAi8uLBiourWMg',

  // Hash SHA-256 da senha admin (gerado fora do código).
  // Para trocar a senha: calcule sha256 da nova senha e atualize apenas este hash.
  ADMIN_PWD_HASH: 'ba354a8f6f7c7604676078d482fdc5bfb519201824383ab756ff9623ff436c39',

  PIX_KEY:   '07bc03ad-72bf-41f1-bf4f-585bcbd2324e',
  WPP_ADMIN: '5597991637163',
  VALOR_BOT: 117,

  SESSION_TTL: 8 * 60 * 60 * 1000,
  SESSION_KEY: 'ict_session',
  REALTIME_INTERVAL_MS: 60_000,
});

const PLANOS = Object.freeze([
  { value: 'Telegram - R$97/mês',           label: 'Telegram · R$97/mês' },
  { value: 'Bot por Estratégia - R$117 + 10%', label: 'Bot · R$117 + 10%' },
  { value: 'Anual - R$1.997 + 15%',         label: 'Anual · R$1.997 + 15%' },
]);

const ESTRATEGIAS = Object.freeze([
  {
    id: 1, icone: '⚽',
    nome: 'Estratégia 01', mercado: 'Over Gols',
    desc: 'Operações voltadas ao mercado de Over Gols. Alta frequência de entradas com gestão automatizada de stake.',
  },
  {
    id: 2, icone: '🛡️',
    nome: 'Estratégia 02', mercado: 'Under Gols',
    desc: 'Operações voltadas ao mercado de Under Gols. Ideal para jogos de baixo volume ofensivo.',
  },
  {
    id: 3, icone: '🎯',
    nome: 'Estratégia 03', mercado: 'Match Odds',
    desc: 'Operações no mercado de Match Odds com análise de valor esperado e automação completa.',
  },
]);
