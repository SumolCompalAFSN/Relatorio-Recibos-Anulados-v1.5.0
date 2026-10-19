import {
  SapRawRow,
  SellerTemplate,
  SellerSummary,
  GtGroup,
  ProcessingKpis,
  ProcessingResult
} from '../types';
import {
  getPrevious5BusinessDays,
  isWithinBusinessDays,
  isWithinCurrentYear
} from './businessDays';
import { normalizeSellerCode } from './excelParser';

export interface AggregatorOptions {
  referenceDate?: Date;
  includeReferenceDateIn5Days?: boolean;
  showZeroActivitySellers?: boolean;
}

/**
 * Agrupa os recibos desduplicados por vendedor e GT,
 * calcula métricas de 5 dias úteis e acumulado ano,
 * ordena decrescente por Acumulado Ano, atribui ranking e destaque visual.
 */
export function aggregateSapData(
  records: SapRawRow[],
  templates: SellerTemplate[],
  options: AggregatorOptions = {}
): ProcessingResult {
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const includeRef = options.includeReferenceDateIn5Days ?? false;
  const showZeroActivity = options.showZeroActivitySellers ?? false;

  const businessDaysRange = getPrevious5BusinessDays(referenceDate, includeRef);
  const yearStart = new Date(referenceDate.getFullYear(), 0, 1);

  // Mapeia templates por código de vendedor
  const templateMap = new Map<string, SellerTemplate>();
  for (const t of templates) {
    const code = normalizeSellerCode(t.codigo);
    if (code) {
      templateMap.set(code, t);
    }
  }

  // Agrupa recibos por vendedor
  const sellerReceiptsMap = new Map<string, SapRawRow[]>();
  for (const row of records) {
    const code = normalizeSellerCode(row.gvnd);
    if (!code) continue;
    if (!sellerReceiptsMap.has(code)) {
      sellerReceiptsMap.set(code, []);
    }
    sellerReceiptsMap.get(code)!.push(row);
  }

  // Identifica todos os códigos a processar
  const allCodes = new Set<string>();
  for (const code of sellerReceiptsMap.keys()) {
    allCodes.add(code);
  }
  if (showZeroActivity) {
    for (const code of templateMap.keys()) {
      allCodes.add(code);
    }
  }

  // Identifica vendedores não mapeados no template
  const unmappedSellers: string[] = [];

  // Constrói resumos individuais
  const rawSummaries: Omit<SellerSummary, 'ranking' | 'highlightStatus'>[] = [];

  for (const code of allCodes) {
    const template = templateMap.get(code);
    const receipts = sellerReceiptsMap.get(code) || [];

    if (!template) {
      unmappedSellers.push(code);
    }

    const nomeVendedor = template?.nomeVendedor || `Vendedor ${code} (Não Registado)`;
    const email = template?.email || '';
    const emailGt = template?.emailGt || 'Sem GT Atribuído';
    // Fallback: Caso Nome GT esteja vazio, utilizar Email GT como alternativa
    const nomeGt = (template?.nomeGt && template.nomeGt.trim()) ? template.nomeGt.trim() : emailGt;

    let ultimos5Dias = 0;
    let acumuladoAno = 0;

    for (const r of receipts) {
      if (isWithinBusinessDays(r.data, businessDaysRange)) {
        ultimos5Dias++;
      }
      if (isWithinCurrentYear(r.data, referenceDate, true)) {
        acumuladoAno++;
      }
    }

    // Se a opção não for mostrar vendedores com zero anulações e tiver 0 no acumulado e nos 5 dias, ignora
    if (!showZeroActivity && acumuladoAno === 0 && ultimos5Dias === 0 && receipts.length === 0) {
      continue;
    }

    rawSummaries.push({
      codigo: code,
      nomeVendedor,
      email,
      nomeGt,
      emailGt,
      ultimos5DiasUteis: ultimos5Dias,
      acumuladoAno,
      receipts
    });
  }

  // Agrupa por Email GT
  const gtBuckets = new Map<string, typeof rawSummaries>();
  for (const s of rawSummaries) {
    const gt = s.emailGt.trim().toLowerCase();
    if (!gtBuckets.has(gt)) {
      gtBuckets.set(gt, []);
    }
    gtBuckets.get(gt)!.push(s);
  }

  // Ordena dentro de cada GT e calcula Ranking + Destaques Visuais
  const gtGroups: GtGroup[] = [];

  for (const [emailGt, sellers] of gtBuckets.entries()) {
    // Regra de Ordenação:
    // "Dentro de cada GT, os vendedores devem ser apresentados por ordem decrescente do total acumulado anual de recibos anulados.
    // O vendedor com mais anulações deve surgir em primeiro lugar."
    sellers.sort((a, b) => {
      if (b.acumuladoAno !== a.acumuladoAno) {
        return b.acumuladoAno - a.acumuladoAno;
      }
      if (b.ultimos5DiasUteis !== a.ultimos5DiasUteis) {
        return b.ultimos5DiasUteis - a.ultimos5DiasUteis;
      }
      return a.nomeVendedor.localeCompare(b.nomeVendedor, 'pt');
    });

    // Atribuição de Ranking (1, 2, 3...) e Destaque Visual:
    // - Vermelho para os 3 vendedores com maior acumulado anual de cada GT.
    // - Amarelo para posições intermédias.
    // - Verde para vendedores sem anulações nos últimos 5 dias úteis (ultimos5DiasUteis === 0).
    const rankedSellers: SellerSummary[] = sellers.map((s, idx) => {
      const ranking = idx + 1;
      let highlightStatus: SellerSummary['highlightStatus'] = 'intermediate';

      if (s.ultimos5DiasUteis === 0) {
        highlightStatus = 'zeroRecent';
      } else if (ranking <= 3 && s.acumuladoAno > 0) {
        highlightStatus = 'top3';
      } else {
        highlightStatus = 'intermediate';
      }

      return {
        ...s,
        ranking,
        highlightStatus
      };
    });

    const totalUltimos5 = rankedSellers.reduce((acc, curr) => acc + curr.ultimos5DiasUteis, 0);
    const totalAno = rankedSellers.reduce((acc, curr) => acc + curr.acumuladoAno, 0);

    // Fallback: Nome GT do grupo (ou Email GT se vazio)
    const groupNomeGt =
      rankedSellers.find((s) => s.nomeGt && s.nomeGt !== s.emailGt)?.nomeGt ||
      rankedSellers[0]?.nomeGt ||
      emailGt;

    gtGroups.push({
      emailGt,
      nomeGt: groupNomeGt,
      totalVendedores: rankedSellers.length,
      totalUltimos5Dias: totalUltimos5,
      totalAcumuladoAno: totalAno,
      vendedores: rankedSellers
    });
  }

  // Ordena os grupos GT pelo total acumulado anual decrescente
  gtGroups.sort((a, b) => b.totalAcumuladoAno - a.totalAcumuladoAno);

  // Calcula KPIs Globais
  const totalRecibos = records.length;
  const sellersWithCancellations = rawSummaries.filter((s) => s.acumuladoAno > 0 || s.ultimos5DiasUteis > 0).length;
  const totalGtEnvolvidos = gtGroups.length;
  const totalZeroRecente = rawSummaries.filter((s) => s.ultimos5DiasUteis === 0).length;

  // Top 10 Vendedores Global
  const allRankedFlat = [...rawSummaries].sort((a, b) => b.acumuladoAno - a.acumuladoAno);
  const top10Vendedores = allRankedFlat.slice(0, 10).map((s) => ({
    codigo: s.codigo,
    nome: s.nomeVendedor,
    gt: s.nomeGt, // Nome GT visual
    emailGt: s.emailGt,
    acumulado: s.acumuladoAno,
    ultimos5Dias: s.ultimos5DiasUteis
  }));

  // Ranking GT (TODOS os GTs existentes, ordenados por Acumulado Ano descendente)
  const rankingGts = gtGroups.map((g) => ({
    emailGt: g.emailGt,
    nomeGt: g.nomeGt, // Nome GT visual
    acumulado: g.totalAcumuladoAno,
    ultimos5Dias: g.totalUltimos5Dias,
    vendedoresCount: g.totalVendedores
  }));

  // Top 10 GTs mantido para compatibilidade
  const top10Gts = rankingGts.slice(0, 10);

  const kpis: ProcessingKpis = {
    totalRecibosAnulados: totalRecibos,
    totalLinhasLidas: totalRecibos,
    totalDuplicadosIgnorados: 0,
    totalVendedoresComAnulacoes: sellersWithCancellations,
    totalGtEnvolvidos,
    totalVendedoresZeroRecente: totalZeroRecente,
    top10Vendedores,
    top10Gts,
    rankingGts
  };

  return {
    processingDate: referenceDate,
    businessDaysRange: {
      start: businessDaysRange.startDate,
      end: businessDaysRange.endDate,
      daysList: businessDaysRange.days,
      formattedRange: businessDaysRange.formattedRange
    },
    yearStart,
    kpis,
    gtGroups,
    allReceipts: records,
    unmappedSellers
  };
}
