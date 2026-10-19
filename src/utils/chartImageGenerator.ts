import { ProcessingKpis, SellerSummary } from '../types';

/**
 * Utilitário para desenhar retângulos com cantos arredondados no Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  if (w < 2 * radius) radius = w / 2;
  if (h < 2 * radius) radius = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Gera a imagem PNG do gráfico: "Vendedores com Anulações nos Últimos 5 Dias Úteis"
 * Suporta a lista global de todos os vendedores ou a lista filtrada por GT.
 */
export function generateVendedores5DiasChartImage(
  vendedores: Array<{
    codigo: string;
    nomeVendedor: string;
    nomeGt?: string;
    emailGt?: string;
    ultimos5DiasUteis: number;
    acumuladoAno?: number;
  }>,
  totalAnulacoes?: number,
  subtitleScope?: string
): string {
  if (typeof document === 'undefined') return '';

  const scale = 2; // Resolução Retina 2x para nitidez perfeita no Outlook
  const width = 700;
  const rowHeight = 44;
  const headerHeight = 72;
  const padding = 20;
  const items = vendedores;
  const calcTotalAnulacoes =
    totalAnulacoes ?? items.reduce((sum, v) => sum + v.ultimos5DiasUteis, 0);

  const contentRows = Math.max(items.length, 1);
  const height = headerHeight + contentRows * rowHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Fundo do Cartão com cantos arredondados
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, width, height, 12);
  ctx.fill();

  // Borda suave do cartão
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, width - 1.5, height - 1.5, 12);
  ctx.stroke();

  // Ícone / Badge de Cabeçalho (Chama / Fogo)
  ctx.fillStyle = '#ffe4e6';
  roundRect(ctx, padding, padding, 34, 34, 8);
  ctx.fill();

  ctx.fillStyle = '#e11d48';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔥', padding + 17, padding + 17);

  // Título e Subtítulo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Vendedores com Anulações nos Últimos 5 Dias Úteis', padding + 44, padding + 2);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const subtitleText = subtitleScope
    ? `Equipa GT: ${subtitleScope} • Classificação por Últimos 5 Dias Úteis`
    : 'Classificação decrescente de todos os vendedores com anulações recentes (> 0)';
  ctx.fillText(subtitleText, padding + 44, padding + 21);

  // Badge da quantidade de Vendedores e Anulações
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeText = `${items.length} ${items.length === 1 ? 'Vendedor' : 'Vendedores'} | ${calcTotalAnulacoes} ${calcTotalAnulacoes === 1 ? 'Anulação' : 'Anulações'}`;
  const badgeWidth = ctx.measureText(badgeText).width + 16;
  ctx.fillStyle = '#fff1f2';
  roundRect(ctx, width - padding - badgeWidth, padding + 6, badgeWidth, 22, 6);
  ctx.fill();

  ctx.fillStyle = '#be123c';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, width - padding - 8, padding + 17);

  // Linha separadora do cabeçalho
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerHeight);
  ctx.lineTo(width - padding, headerHeight);
  ctx.stroke();

  // Caso não haja vendedores
  if (items.length === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Nenhum vendedor registou anulações nos últimos 5 dias úteis.', width / 2, headerHeight + 30);
    return canvas.toDataURL('image/png');
  }

  // Linhas dos Vendedores
  const maxVal = Math.max(...items.map((v) => v.ultimos5DiasUteis), 1);
  const contentWidth = width - padding * 2;

  let currentY = headerHeight + 12;

  items.forEach((v, idx) => {
    const isTop3 = idx < 3;

    // 1. Badge de Ranking (#1, #2, #3, ...)
    const badgeSize = 20;
    const badgeX = padding;
    const badgeY = currentY + 1;

    ctx.fillStyle = isTop3 ? '#fee2e2' : '#f1f5f9';
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
    ctx.fill();

    ctx.fillStyle = isTop3 ? '#be123c' : '#475569';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // 2. Código Vendedor (texto mono)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(v.codigo, padding + 28, currentY + 4);

    // 3. Nome do Vendedor
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(v.nomeVendedor, padding + 68, currentY + 4);

    // 4. Nome GT entre parênteses
    const gtLabel = v.nomeGt || v.emailGt || '';
    if (gtLabel) {
      const nameWidth = ctx.measureText(v.nomeVendedor).width;
      ctx.font = 'normal 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`(${gtLabel})`, padding + 74 + nameWidth, currentY + 5);
    }

    // 5. Métrica à Direita: "5d:" e Valor
    ctx.textAlign = 'right';
    ctx.font = 'normal 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`5d: `, width - padding - 36, currentY + 4);

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isTop3 ? '#be123c' : '#0f172a';
    ctx.fillText(String(v.ultimos5DiasUteis), width - padding, currentY + 3);

    // 6. Barra de Progresso Horizontal
    const barY = currentY + 23;
    const barHeight = 8;
    const barWidth = contentWidth;

    // Fundo da barra
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, padding, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Preenchimento proporcional
    const fillWidth = Math.max(8, Math.round((v.ultimos5DiasUteis / maxVal) * barWidth));
    if (isTop3) {
      const grad = ctx.createLinearGradient(padding, 0, padding + fillWidth, 0);
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#2563eb';
    }
    roundRect(ctx, padding, barY, fillWidth, barHeight, 4);
    ctx.fill();

    currentY += rowHeight;
  });

  return canvas.toDataURL('image/png');
}

/**
 * Gera a imagem PNG do gráfico: "Top 10 Vendedores com Mais Anulações"
 */
export function generateTop10VendedoresChartImage(
  vendedores: ProcessingKpis['top10Vendedores']
): string {
  if (typeof document === 'undefined') return '';

  const scale = 2; // Resolução Retina 2x para nitidez perfeita no Outlook
  const width = 700;
  const rowHeight = 44;
  const headerHeight = 72;
  const padding = 20;
  const items = vendedores.slice(0, 10);
  const height = headerHeight + items.length * rowHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Fundo do Cartão com cantos arredondados
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, width, height, 12);
  ctx.fill();

  // Borda suave do cartão
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, width - 1.5, height - 1.5, 12);
  ctx.stroke();

  // Ícone / Badge de Cabeçalho
  ctx.fillStyle = '#ffe4e6';
  roundRect(ctx, padding, padding, 34, 34, 8);
  ctx.fill();

  ctx.fillStyle = '#e11d48';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', padding + 17, padding + 17);

  // Título e Subtítulo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Top 10 Vendedores com Mais Anulações', padding + 44, padding + 2);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Classificação por Acumulado Anual de Recibos Anulados', padding + 44, padding + 21);

  // Linha separadora do cabeçalho
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerHeight);
  ctx.lineTo(width - padding, headerHeight);
  ctx.stroke();

  // Linhas dos Vendedores
  const maxVal = Math.max(...items.map((v) => v.acumulado), 1);
  const contentWidth = width - padding * 2;

  let currentY = headerHeight + 12;

  items.forEach((v, idx) => {
    const isTop3 = idx < 3;

    // 1. Badge de Ranking (#1, #2, #3, ...)
    const badgeSize = 20;
    const badgeX = padding;
    const badgeY = currentY + 1;

    ctx.fillStyle = isTop3 ? '#fee2e2' : '#f1f5f9';
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
    ctx.fill();

    ctx.fillStyle = isTop3 ? '#be123c' : '#475569';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // 2. Código Vendedor (texto mono)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(v.codigo, padding + 28, currentY + 4);

    // 3. Nome do Vendedor
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(v.nome, padding + 68, currentY + 4);

    // 4. Nome GT entre parênteses
    const nameWidth = ctx.measureText(v.nome).width;
    ctx.font = 'normal 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`(${v.gt})`, padding + 74 + nameWidth, currentY + 5);

    // 5. Métricas à Direita: "5d: X" e Total "Y"
    ctx.textAlign = 'right';
    ctx.font = 'normal 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`5d: `, width - padding - 40, currentY + 4);

    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`${v.ultimos5Dias}`, width - padding - 28, currentY + 4);

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isTop3 ? '#be123c' : '#0f172a';
    ctx.fillText(String(v.acumulado), width - padding, currentY + 3);

    // 6. Barra de Progresso Horizontal
    const barY = currentY + 23;
    const barHeight = 8;
    const barWidth = contentWidth;

    // Fundo da barra
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, padding, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Preenchimento proporcional
    const fillWidth = Math.max(8, Math.round((v.acumulado / maxVal) * barWidth));
    if (isTop3) {
      const grad = ctx.createLinearGradient(padding, 0, padding + fillWidth, 0);
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#2563eb';
    }
    roundRect(ctx, padding, barY, fillWidth, barHeight, 4);
    ctx.fill();

    currentY += rowHeight;
  });

  return canvas.toDataURL('image/png');
}

/**
 * Gera a imagem PNG do gráfico: "Ranking GT" (com TODOS os GTs)
 */
export function generateRankingGtChartImage(
  gts: ProcessingKpis['rankingGts']
): string {
  if (typeof document === 'undefined') return '';

  const scale = 2; // Resolução Retina 2x
  const width = 700;
  const rowHeight = 44;
  const headerHeight = 72;
  const padding = 20;
  const items = gts; // TODOS os GTs
  const height = headerHeight + items.length * rowHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Fundo do Cartão com cantos arredondados
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, width, height, 12);
  ctx.fill();

  // Borda suave do cartão
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, width - 1.5, height - 1.5, 12);
  ctx.stroke();

  // Ícone / Badge de Cabeçalho
  ctx.fillStyle = '#dbeafe';
  roundRect(ctx, padding, padding, 34, 34, 8);
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏢', padding + 17, padding + 17);

  // Título e Subtítulo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Ranking GT', padding + 44, padding + 2);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Volume total de anulações consolidado por equipa GT', padding + 44, padding + 21);

  // Badge da quantidade de GTs
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeText = `${items.length} GTs Totais`;
  const badgeWidth = ctx.measureText(badgeText).width + 16;
  ctx.fillStyle = '#eff6ff';
  roundRect(ctx, width - padding - badgeWidth, padding + 6, badgeWidth, 22, 6);
  ctx.fill();

  ctx.fillStyle = '#1d4ed8';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, width - padding - 8, padding + 17);

  // Linha separadora do cabeçalho
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerHeight);
  ctx.lineTo(width - padding, headerHeight);
  ctx.stroke();

  // Linhas de cada GT
  const maxVal = Math.max(...items.map((g) => g.acumulado), 1);
  const contentWidth = width - padding * 2;

  let currentY = headerHeight + 12;

  items.forEach((g, idx) => {
    // 1. Badge de Ranking
    const badgeSize = 20;
    const badgeX = padding;
    const badgeY = currentY + 1;

    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // 2. Nome GT (Apresentação visual obrigatória)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(g.nomeGt || g.emailGt, padding + 28, currentY + 4);

    // 3. Contagem de vendedores
    const gtNameWidth = ctx.measureText(g.nomeGt || g.emailGt).width;
    ctx.font = 'normal 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`(${g.vendedoresCount} vend.)`, padding + 34 + gtNameWidth, currentY + 5);

    // 4. Métricas à Direita: "5d: X" e Total "Y"
    ctx.textAlign = 'right';
    ctx.font = 'normal 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`5d: `, width - padding - 40, currentY + 4);

    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`${g.ultimos5Dias}`, width - padding - 28, currentY + 4);

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(String(g.acumulado), width - padding, currentY + 3);

    // 5. Barra de Progresso Horizontal
    const barY = currentY + 23;
    const barHeight = 8;
    const barWidth = contentWidth;

    // Fundo da barra
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, padding, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Preenchimento proporcional com gradiente
    const fillWidth = Math.max(8, Math.round((g.acumulado / maxVal) * barWidth));
    const grad = ctx.createLinearGradient(padding, 0, padding + fillWidth, 0);
    grad.addColorStop(0, '#2563eb');
    grad.addColorStop(1, '#4f46e5');
    ctx.fillStyle = grad;

    roundRect(ctx, padding, barY, fillWidth, barHeight, 4);
    ctx.fill();

    currentY += rowHeight;
  });

  return canvas.toDataURL('image/png');
}

/**
 * Gera a imagem PNG do gráfico: "Ranking da Equipa" (apenas os vendedores do GT selecionado)
 * Ordenado por Acumulado Ano (descendente)
 */
export function generateTeamRankingChartImage(
  vendedores: SellerSummary[],
  gtName: string
): string {
  if (typeof document === 'undefined') return '';

  const scale = 2; // Resolução Retina 2x para nitidez perfeita no Outlook
  const width = 700;
  const rowHeight = 44;
  const headerHeight = 72;
  const padding = 20;

  // Ordenação por Acumulado Ano descendente
  const items = [...vendedores].sort((a, b) => b.acumuladoAno - a.acumuladoAno);
  const height = headerHeight + Math.max(items.length, 1) * rowHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Fundo do Cartão com cantos arredondados
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, width, height, 12);
  ctx.fill();

  // Borda suave do cartão
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, width - 1.5, height - 1.5, 12);
  ctx.stroke();

  // Ícone / Badge de Cabeçalho (Equipa)
  ctx.fillStyle = '#e0e7ff';
  roundRect(ctx, padding, padding, 34, 34, 8);
  ctx.fill();

  ctx.fillStyle = '#3730a3';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👥', padding + 17, padding + 17);

  // Título e Subtítulo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Ranking da Equipa', padding + 44, padding + 2);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`GT: ${gtName} • Classificação por Acumulado Anual`, padding + 44, padding + 21);

  // Badge da quantidade de vendedores
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeText = `${items.length} ${items.length === 1 ? 'Vendedor' : 'Vendedores'}`;
  const badgeWidth = ctx.measureText(badgeText).width + 16;
  ctx.fillStyle = '#eef2ff';
  roundRect(ctx, width - padding - badgeWidth, padding + 6, badgeWidth, 22, 6);
  ctx.fill();

  ctx.fillStyle = '#4338ca';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, width - padding - 8, padding + 17);

  // Linha separadora do cabeçalho
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerHeight);
  ctx.lineTo(width - padding, headerHeight);
  ctx.stroke();

  if (items.length === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Nenhum vendedor associado a esta equipa.', width / 2, headerHeight + 30);
    return canvas.toDataURL('image/png');
  }

  // Linhas dos Vendedores da Equipa
  const maxVal = Math.max(...items.map((v) => v.acumuladoAno), 1);
  const contentWidth = width - padding * 2;

  let currentY = headerHeight + 12;

  items.forEach((v, idx) => {
    const isTop3 = idx < 3 && v.acumuladoAno > 0;

    // 1. Badge de Posição (#1, #2, #3, ...)
    const badgeSize = 20;
    const badgeX = padding;
    const badgeY = currentY + 1;

    ctx.fillStyle = isTop3 ? '#fee2e2' : '#f1f5f9';
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
    ctx.fill();

    ctx.fillStyle = isTop3 ? '#be123c' : '#475569';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // 2. Código Vendedor
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(v.codigo, padding + 28, currentY + 4);

    // 3. Nome do Vendedor
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(v.nomeVendedor, padding + 68, currentY + 4);

    // 4. Métricas à Direita: "5d: X" e Total "Y"
    ctx.textAlign = 'right';
    ctx.font = 'normal 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`5d: `, width - padding - 40, currentY + 4);

    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`${v.ultimos5DiasUteis}`, width - padding - 28, currentY + 4);

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isTop3 ? '#be123c' : '#0f172a';
    ctx.fillText(String(v.acumuladoAno), width - padding, currentY + 3);

    // 5. Barra de Progresso Horizontal
    const barY = currentY + 23;
    const barHeight = 8;
    const barWidth = contentWidth;

    // Fundo da barra
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, padding, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Preenchimento proporcional
    const fillWidth = Math.max(8, Math.round((v.acumuladoAno / maxVal) * barWidth));
    if (isTop3) {
      const grad = ctx.createLinearGradient(padding, 0, padding + fillWidth, 0);
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#3b82f6';
    }
    roundRect(ctx, padding, barY, fillWidth, barHeight, 4);
    ctx.fill();

    currentY += rowHeight;
  });

  return canvas.toDataURL('image/png');
}
