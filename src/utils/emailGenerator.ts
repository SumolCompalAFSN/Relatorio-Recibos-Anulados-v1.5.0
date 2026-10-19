import { ProcessingResult, GtGroup } from '../types';
import { FIXED_CC_EMAILS } from '../data/defaultTemplate';
import {
  generateVendedores5DiasChartImage,
  generateTop10VendedoresChartImage,
  generateRankingGtChartImage,
  generateTeamRankingChartImage
} from './chartImageGenerator';

export interface EmailData {
  to: string[];
  cc: string[];
  subject: string;
  htmlBody: string;
  plainTextBody: string;
  chartVendedores5DiasBase64?: string;
  chartTop10Base64?: string;
  chartRankingGtBase64?: string;
  chartTeamRankingBase64?: string;
}

/**
 * Retorna os emails TO únicos (todos os GTs válidos encontrados)
 */
export function extractToGtEmails(gtGroups: GtGroup[]): string[] {
  const emails = new Set<string>();
  for (const group of gtGroups) {
    const email = group.emailGt.trim().toLowerCase();
    if (email && email.includes('@') && !email.includes('não atribuído') && !email.includes('sem gt')) {
      emails.add(email);
    }
  }
  return Array.from(emails);
}

export interface GenerateHtmlOptions {
  vendedores5DiasImg?: string;
  top10Img?: string;
  rankingGtImg?: string;
  isForEml?: boolean;
}

/**
 * Gera o HTML completo do email, com estilos inline robustos para Outlook e Gmail.
 * Inclui os gráficos de Vendedores dos Últimos 5 Dias, Top 10 Vendedores e Ranking GT antes das tabelas detalhadas.
 */
export function generateEmailHtml(
  result: ProcessingResult,
  options?: GenerateHtmlOptions
): string {
  const { gtGroups, businessDaysRange, processingDate } = result;

  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Lista de todos os vendedores com ultimos5DiasUteis > 0
  const activeSellers5d = gtGroups
    .flatMap((g) => g.vendedores)
    .filter((v) => v.ultimos5DiasUteis > 0)
    .sort((a, b) => {
      if (b.ultimos5DiasUteis !== a.ultimos5DiasUteis) {
        return b.ultimos5DiasUteis - a.ultimos5DiasUteis;
      }
      return a.nomeVendedor.localeCompare(b.nomeVendedor, 'pt');
    });

  const totalAnulacoes5d = activeSellers5d.reduce((sum, v) => sum + v.ultimos5DiasUteis, 0);

  // Imagens dos gráficos
  const vendedores5DiasImg =
    options?.vendedores5DiasImg ??
    (result.chartImages?.vendedores5DiasPng ||
      generateVendedores5DiasChartImage(activeSellers5d, totalAnulacoes5d));

  const top10Img =
    options?.top10Img ??
    (result.chartImages?.top10VendedoresPng ||
      generateTop10VendedoresChartImage(result.kpis.top10Vendedores));

  const rankingGtImg =
    options?.rankingGtImg ??
    (result.chartImages?.rankingGtPng ||
      generateRankingGtChartImage(result.kpis.rankingGts || result.kpis.top10Gts));

  const vendedores5DiasSrc = options?.isForEml ? 'cid:chart_vendedores_5dias' : vendedores5DiasImg;
  const top10Src = options?.isForEml ? 'cid:chart_top10_vendedores' : top10Img;
  const rankingGtSrc = options?.isForEml ? 'cid:chart_ranking_gt' : rankingGtImg;

  // Constrói tabelas por GT
  const tablesHtml = gtGroups
    .map((group) => {
      const rowsHtml = group.vendedores
        .map((s) => {
          let rankBadgeBg = '#f3f4f6';
          let rankBadgeColor = '#374151';
          let rowBg = '#ffffff';
          let statusBadge = '';

          if (s.ultimos5DiasUteis === 0) {
            statusBadge = `<span style="display:inline-block; padding:2px 8px; font-size:11px; font-weight:600; border-radius:12px; background-color:#dcfce7; color:#15803d; border:1px solid #bbf7d0;">✓ 0 Anulações (5d)</span>`;
          }

          if (s.ranking <= 3 && s.acumuladoAno > 0) {
            rankBadgeBg = '#fee2e2';
            rankBadgeColor = '#b91c1c';
            rowBg = '#fff8f8';
          } else if (s.acumuladoAno > 0) {
            rankBadgeBg = '#fef3c7';
            rankBadgeColor = '#b45309';
          }

          const recentCellBg = s.ultimos5DiasUteis === 0 ? '#f0fdf4' : '#ffffff';
          const recentTextColor = s.ultimos5DiasUteis === 0 ? '#16a34a' : '#1f2937';

          return `
            <tr style="background-color:${rowBg}; border-bottom:1px solid #e5e7eb;">
              <td style="padding:10px 12px; text-align:center; font-weight:bold; font-size:13px; color:#111827;">
                <span style="display:inline-block; min-width:24px; padding:3px 8px; border-radius:12px; background-color:${rankBadgeBg}; color:${rankBadgeColor}; font-weight:700;">
                  #${s.ranking}
                </span>
              </td>
              <td style="padding:10px 12px; text-align:left; font-family:'Courier New', monospace; font-weight:bold; color:#1e3a8a; font-size:13px;">
                ${s.codigo}
              </td>
              <td style="padding:10px 12px; text-align:left; font-size:13px; color:#1f2937;">
                <strong>${s.nomeVendedor}</strong>
                ${statusBadge ? `<div style="margin-top:3px;">${statusBadge}</div>` : ''}
              </td>
              <td style="padding:10px 12px; text-align:center; font-size:13px; font-weight:700; background-color:${recentCellBg}; color:${recentTextColor}; border-left:1px solid #f3f4f6; border-right:1px solid #f3f4f6;">
                ${s.ultimos5DiasUteis}
              </td>
              <td style="padding:10px 12px; text-align:center; font-size:13px; font-weight:700; color:#111827;">
                ${s.acumuladoAno}
              </td>
            </tr>
          `;
        })
        .join('');

      return `
        <div style="margin-bottom:28px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <!-- Cabeçalho GT -->
          <div style="background-color:#1e3a8a; padding:12px 18px; display:block;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="text-align:left; vertical-align:middle;">
                  <span style="font-size:15px; font-weight:700; color:#ffffff; letter-spacing:0.3px;">
                    GT: <span style="color:#ffffff;">${group.nomeGt || group.emailGt}</span>
                  </span>
                </td>
                <td style="text-align:right; vertical-align:middle; color:#dbeafe; font-size:12px;">
                  <span>Vendedores: <strong>${group.totalVendedores}</strong></span> |
                  <span>5 Dias Úteis: <strong>${group.totalUltimos5Dias}</strong></span> |
                  <span>Acumulado Ano: <strong>${group.totalAcumuladoAno}</strong></span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Tabela de Vendedores -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <thead>
              <tr style="background-color:#f8fafc; border-bottom:2px solid #cbd5e1; font-size:12px; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">
                <th style="padding:10px 12px; text-align:center; width:70px;">Ranking</th>
                <th style="padding:10px 12px; text-align:left; width:80px;">Código</th>
                <th style="padding:10px 12px; text-align:left;">Vendedor</th>
                <th style="padding:10px 12px; text-align:center; width:150px; background-color:#f1f5f9;">Últimos 5 Dias Úteis</th>
                <th style="padding:10px 12px; text-align:center; width:130px;">Acumulado Ano</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color:#f1f5f9; font-weight:bold; border-top:2px solid #cbd5e1; font-size:12px; color:#1e293b;">
                <td colspan="3" style="padding:10px 12px; text-align:right;">Subtotal ${group.nomeGt || group.emailGt}:</td>
                <td style="padding:10px 12px; text-align:center; color:#1e40af;">${group.totalUltimos5Dias}</td>
                <td style="padding:10px 12px; text-align:center; color:#0f172a;">${group.totalAcumuladoAno}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Semanal de Recibos Anulados</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1f2937; line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:760px; background-color:#ffffff; border-radius:10px; border:1px solid #e5e7eb; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <!-- Top Banner Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); background-color:#1e3a8a; padding:24px 28px; color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.3px;">
                      CONTROLO DE RECIBOS ANULADOS
                    </h1>
                    <div style="margin-top:6px; font-size:13px; color:#e0e7ff;">
                      Resumo Semanal de Recibos Anulados
                    </div>
                  </td>
                  <td style="text-align:right; vertical-align:middle;">
                    <div style="background-color:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); border-radius:6px; padding:6px 12px; display:inline-block; text-align:center;">
                      <div style="font-size:10px; text-transform:uppercase; color:#bfdbfe; font-weight:600;">Data Processamento</div>
                      <div style="font-size:13px; font-weight:700; color:#ffffff;">${formatDatePt(processingDate)}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do Email -->
          <tr>
            <td style="padding:28px 28px 32px 28px; font-size:14px; color:#374151;">
              <p style="margin:0 0 16px 0; font-size:15px; color:#111827;">
                Boa tarde,
              </p>
              
              <p style="margin:0 0 14px 0; line-height:1.6;">
                Segue abaixo o resumo dos recibos anulados por vendedor, agrupado por GT.
              </p>
              
              <div style="background-color:#f8fafc; border-left:4px solid #3b82f6; border-radius:4px; padding:12px 16px; margin:0 0 16px 0;">
                <p style="margin:0 0 6px 0; font-weight:600; color:#1e293b;">Para cada vendedor são apresentados:</p>
                <ul style="margin:0; padding-left:20px; color:#475569;">
                  <li style="margin-bottom:4px;">
                    <strong>Recibos anulados nos últimos 5 dias úteis</strong> (${formatDatePt(businessDaysRange.start)} a ${formatDatePt(businessDaysRange.end)});
                  </li>
                  <li>
                    <strong>Recibos anulados acumulados desde o início do ano</strong> (desde 01/01/${processingDate.getFullYear()}).
                  </li>
                </ul>
              </div>

              <p style="margin:0 0 24px 0; line-height:1.6; color:#4b5563;">
                Esta informação pretende proporcionar uma visão consolidada da atividade de anulações e facilitar o acompanhamento dos pedidos de anulação efetuados pelos comerciais.
              </p>

              <!-- ============================================== -->
              <!-- GRÁFICO 1: Vendedores com Anulações nos Últimos 5 Dias Úteis -->
              <!-- ============================================== -->
              ${
                vendedores5DiasSrc
                  ? `
              <div style="margin:0 0 24px 0; text-align:center;">
                <div style="font-size:13px; font-weight:700; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; text-align:left;">
                  Gráfico 1 &bull; Vendedores com Anulações nos Últimos 5 Dias Úteis
                </div>
                <img src="${vendedores5DiasSrc}" alt="Vendedores com Anulações nos Últimos 5 Dias Úteis" width="704" style="width:100%; max-width:704px; height:auto; display:block; margin:0 auto; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);" />
              </div>
              `
                  : ''
              }

              <!-- ============================================== -->
              <!-- GRÁFICO 2: Top 10 Vendedores com Mais Anulações -->
              <!-- ============================================== -->
              ${
                top10Src
                  ? `
              <div style="margin:0 0 24px 0; text-align:center;">
                <div style="font-size:13px; font-weight:700; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; text-align:left;">
                  Gráfico 2 &bull; Top 10 Vendedores com Mais Anulações
                </div>
                <img src="${top10Src}" alt="Top 10 Vendedores com Mais Anulações" width="704" style="width:100%; max-width:704px; height:auto; display:block; margin:0 auto; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);" />
              </div>
              `
                  : ''
              }

              <!-- ============================================== -->
              <!-- GRÁFICO 3: Ranking GT (Todos os GTs)            -->
              <!-- ============================================== -->
              ${
                rankingGtSrc
                  ? `
              <div style="margin:0 0 28px 0; text-align:center;">
                <div style="font-size:13px; font-weight:700; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; text-align:left;">
                  Gráfico 3 &bull; Ranking GT (Todos os GTs)
                </div>
                <img src="${rankingGtSrc}" alt="Ranking GT" width="704" style="width:100%; max-width:704px; height:auto; display:block; margin:0 auto; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);" />
              </div>
              `
                  : ''
              }

              <!-- ============================================== -->
              <!-- TABELAS DETALHADAS POR GT                      -->
              <!-- ============================================== -->
              <div style="font-size:14px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin:28px 0 14px 0; border-top:2px solid #e2e8f0; padding-top:16px;">
                Tabelas Detalhadas por Gestor de Território (GT)
              </div>

              ${tablesHtml}

              <p style="margin:28px 0 0 0; color:#111827; font-weight:600; line-height:1.6;">
                Com os melhores cumprimentos,<br><br>
                <span style="font-weight:600; color:#111827;">Equipa AFSN</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Gera a versão em texto simples do email
 */
export function generateEmailPlainText(result: ProcessingResult): string {
  const { gtGroups, businessDaysRange, processingDate, kpis } = result;

  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let text = `Boa tarde,\n\n`;
  text += `Segue abaixo o resumo dos recibos anulados por vendedor, agrupado por GT.\n\n`;
  text += `Para cada vendedor são apresentados:\n\n`;
  text += `• Recibos anulados nos últimos 5 dias úteis (${formatDatePt(businessDaysRange.start)} a ${formatDatePt(businessDaysRange.end)})\n`;
  text += `• Recibos anulados acumulados desde o início do ano (desde 01/01/${processingDate.getFullYear()})\n\n`;
  text += `Esta informação pretende proporcionar uma visão consolidada da atividade de anulações e facilitar o acompanhamento dos pedidos de anulação efetuados pelos comerciais.\n\n`;

  // Gráfico 1: Vendedores com Anulações nos Últimos 5 Dias Úteis
  text += `====================================================\n`;
  text += `GRÁFICO 1: VENDEDORES COM ANULAÇÕES NOS ÚLTIMOS 5 DIAS ÚTEIS\n`;
  text += `====================================================\n`;
  const activeSellers5d = gtGroups
    .flatMap((g) => g.vendedores)
    .filter((v) => v.ultimos5DiasUteis > 0)
    .sort((a, b) => {
      if (b.ultimos5DiasUteis !== a.ultimos5DiasUteis) {
        return b.ultimos5DiasUteis - a.ultimos5DiasUteis;
      }
      return a.nomeVendedor.localeCompare(b.nomeVendedor, 'pt');
    });

  if (activeSellers5d.length === 0) {
    text += `Nenhum vendedor com anulações nos últimos 5 dias úteis.\n`;
  } else {
    activeSellers5d.forEach((v, idx) => {
      text += `${idx + 1}. [${v.codigo}] ${v.nomeVendedor} (${v.nomeGt || v.emailGt}) - 5d: ${v.ultimos5DiasUteis}\n`;
    });
  }
  text += `\n`;

  // Gráfico 2 Texto
  text += `====================================================\n`;
  text += `GRÁFICO 2: TOP 10 VENDEDORES COM MAIS ANULAÇÕES\n`;
  text += `====================================================\n`;
  kpis.top10Vendedores.forEach((v, idx) => {
    text += `${idx + 1}. [${v.codigo}] ${v.nome} (${v.gt}) - 5d: ${v.ultimos5Dias} | Acumulado Ano: ${v.acumulado}\n`;
  });
  text += `\n`;

  // Gráfico 3 Texto
  const gts = kpis.rankingGts || kpis.top10Gts;
  text += `====================================================\n`;
  text += `GRÁFICO 3: RANKING GT (TODOS OS GTS)\n`;
  text += `====================================================\n`;
  gts.forEach((g, idx) => {
    text += `${idx + 1}. ${g.nomeGt || g.emailGt} (${g.vendedoresCount} vend.) - 5d: ${g.ultimos5Dias} | Acumulado Ano: ${g.acumulado}\n`;
  });
  text += `\n`;

  // Tabelas detalhadas
  text += `====================================================\n`;
  text += `TABELAS DETALHADAS POR GT\n`;
  text += `====================================================\n\n`;

  for (const group of gtGroups) {
    const gtDisplayName = group.nomeGt || group.emailGt;
    text += `====================================================\n`;
    text += `GT: ${gtDisplayName}\n`;
    text += `====================================================\n`;
    text += `Ranking | Código | Vendedor               | Últimos 5 Dias | Acumulado Ano\n`;
    text += `----------------------------------------------------\n`;

    for (const s of group.vendedores) {
      const rank = String(s.ranking).padEnd(7);
      const code = s.codigo.padEnd(6);
      const name = s.nomeVendedor.slice(0, 22).padEnd(22);
      const ult5 = String(s.ultimos5DiasUteis).padStart(14);
      const acum = String(s.acumuladoAno).padStart(14);
      text += `${rank} | ${code} | ${name} | ${ult5} | ${acum}\n`;
    }
    text += `----------------------------------------------------\n`;
    text += `Total ${gtDisplayName}: 5 Dias: ${group.totalUltimos5Dias} | Acumulado: ${group.totalAcumuladoAno}\n\n`;
  }

  text += `Com os melhores cumprimentos,\n\nEquipa AFSN\n`;

  return text;
}

/**
 * Monta o pacote de dados do email (TO, CC, Assunto, HTML e Plain Text)
 */
export function buildEmailData(result: ProcessingResult): EmailData {
  const to = extractToGtEmails(result.gtGroups);
  const cc = FIXED_CC_EMAILS;
  const subject = 'Resumo Semanal de Recibos Anulados';

  // Lista de todos os vendedores com ultimos5DiasUteis > 0
  const activeSellers5d = result.gtGroups
    .flatMap((g) => g.vendedores)
    .filter((v) => v.ultimos5DiasUteis > 0)
    .sort((a, b) => {
      if (b.ultimos5DiasUteis !== a.ultimos5DiasUteis) {
        return b.ultimos5DiasUteis - a.ultimos5DiasUteis;
      }
      return a.nomeVendedor.localeCompare(b.nomeVendedor, 'pt');
    });

  const totalAnulacoes5d = activeSellers5d.reduce((sum, v) => sum + v.ultimos5DiasUteis, 0);

  // Gera as imagens dos gráficos em PNG
  const vendedores5DiasPng =
    result.chartImages?.vendedores5DiasPng ||
    generateVendedores5DiasChartImage(activeSellers5d, totalAnulacoes5d);

  const top10Png =
    result.chartImages?.top10VendedoresPng ||
    generateTop10VendedoresChartImage(result.kpis.top10Vendedores);

  const rankingGtPng =
    result.chartImages?.rankingGtPng ||
    generateRankingGtChartImage(result.kpis.rankingGts || result.kpis.top10Gts);

  const htmlBody = generateEmailHtml(result, {
    vendedores5DiasImg: vendedores5DiasPng,
    top10Img: top10Png,
    rankingGtImg: rankingGtPng,
    isForEml: false
  });

  const plainTextBody = generateEmailPlainText(result);

  const chartVendedores5DiasBase64 = vendedores5DiasPng
    ? vendedores5DiasPng.replace(/^data:image\/png;base64,/, '')
    : undefined;
  const chartTop10Base64 = top10Png ? top10Png.replace(/^data:image\/png;base64,/, '') : undefined;
  const chartRankingGtBase64 = rankingGtPng ? rankingGtPng.replace(/^data:image\/png;base64,/, '') : undefined;

  return {
    to,
    cc,
    subject,
    htmlBody,
    plainTextBody,
    chartVendedores5DiasBase64,
    chartTop10Base64,
    chartRankingGtBase64
  };
}

/**
 * Codifica strings UTF-8 em Base64 com quebra de linhas a 76 caracteres (RFC 2045)
 */
function encodeMimeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.match(/.{1,76}/g)?.join('\r\n') || base64;
}

/**
 * Quebra strings Base64 puras a 76 caracteres para compatibilidade MIME rigorosa
 */
function encodeMimeBase64Raw(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  return clean.match(/.{1,76}/g)?.join('\r\n') || clean;
}

/**
 * Codifica cabeçalho de assunto conforme RFC 2047
 */
function encodeHeaderSubject(subject: string): string {
  const bytes = new TextEncoder().encode(subject);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

/**
 * Gera o ficheiro .EML padrão RFC 822 com gráficos incorporados inline.
 * Utiliza o cabeçalho X-Unsent: 1 para abrir diretamente no Novo Outlook em modo de composição/rascunho
 * com o corpo HTML totalmente renderizado e os gráficos inline (Content-ID).
 */
export function generateEmlString(emailData: EmailData, result?: ProcessingResult): string {
  const boundaryMixed = `----=_NextPart_Mixed_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const boundaryRel = `----=_NextPart_Rel_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const dateStr = new Date().toUTCString();

  const toHeader = emailData.to.join(', ');
  const ccHeader = emailData.cc.join(', ');

  const hasCharts = Boolean(
    emailData.chartVendedores5DiasBase64 ||
    emailData.chartTop10Base64 ||
    emailData.chartRankingGtBase64
  );

  // Se houver gráficos, utiliza a versão HTML com cid: e anexa as imagens inline
  let emlHtmlBody = emailData.htmlBody;
  if (result) {
    emlHtmlBody = generateEmailHtml(result, {
      isForEml: true
    });
  } else if (hasCharts) {
    // substitui data url por cid
    emlHtmlBody = emlHtmlBody
      .replace(/src="data:image\/png;base64,[^"]*Vendedores com Anulações[^"]*"/, 'src="cid:chart_vendedores_5dias"')
      .replace(/src="data:image\/png;base64,[^"]*Top 10[^"]*"/, 'src="cid:chart_top10_vendedores"')
      .replace(/src="data:image\/png;base64,[^"]*Ranking GT[^"]*"/, 'src="cid:chart_ranking_gt"');
  }

  if (hasCharts) {
    const lines = [
      'X-Unsent: 1',
      'From: "Controlo de Recibos Anulados" <noreply@sumolcompal.pt>',
      `To: ${toHeader}`,
      `Cc: ${ccHeader}`,
      `Subject: ${encodeHeaderSubject(emailData.subject)}`,
      `Date: ${dateStr}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${boundaryRel}"`,
      '',
      'This is a multi-part message in MIME format.',
      '',
      `--${boundaryRel}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeMimeBase64(emlHtmlBody),
      ''
    ];

    if (emailData.chartVendedores5DiasBase64) {
      lines.push(
        `--${boundaryRel}`,
        'Content-Type: image/png; name="chart_vendedores_5dias.png"',
        'Content-Transfer-Encoding: base64',
        'Content-ID: <chart_vendedores_5dias>',
        'Content-Disposition: inline; filename="chart_vendedores_5dias.png"',
        '',
        encodeMimeBase64Raw(emailData.chartVendedores5DiasBase64),
        ''
      );
    }

    if (emailData.chartTop10Base64) {
      lines.push(
        `--${boundaryRel}`,
        'Content-Type: image/png; name="chart_top10_vendedores.png"',
        'Content-Transfer-Encoding: base64',
        'Content-ID: <chart_top10_vendedores>',
        'Content-Disposition: inline; filename="chart_top10_vendedores.png"',
        '',
        encodeMimeBase64Raw(emailData.chartTop10Base64),
        ''
      );
    }

    if (emailData.chartRankingGtBase64) {
      lines.push(
        `--${boundaryRel}`,
        'Content-Type: image/png; name="chart_ranking_gt.png"',
        'Content-Transfer-Encoding: base64',
        'Content-ID: <chart_ranking_gt>',
        'Content-Disposition: inline; filename="chart_ranking_gt.png"',
        '',
        encodeMimeBase64Raw(emailData.chartRankingGtBase64),
        ''
      );
    }

    lines.push(`--${boundaryRel}--`, '');
    return lines.join('\r\n');
  }

  // Fallback caso não haja imagens
  const lines = [
    'X-Unsent: 1',
    'From: "Controlo de Recibos Anulados" <noreply@sumolcompal.pt>',
    `To: ${toHeader}`,
    `Cc: ${ccHeader}`,
    `Subject: ${encodeHeaderSubject(emailData.subject)}`,
    `Date: ${dateStr}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundaryMixed}"`,
    '',
    'This is a multi-part message in MIME format.',
    '',
    `--${boundaryMixed}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimeBase64(emailData.plainTextBody),
    '',
    `--${boundaryMixed}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimeBase64(emlHtmlBody),
    '',
    `--${boundaryMixed}--`,
    ''
  ];

  return lines.join('\r\n');
}

/**
 * =========================================================================
 * FUNCIONALIDADE DE ENVIO INDIVIDUAL POR GT
 * Gera email filtrado exclusivamente para a equipa do GT selecionado
 * =========================================================================
 */

export interface IndividualGtHtmlOptions {
  team5DiasImg?: string;
  teamChartImg?: string;
  isForEml?: boolean;
}

/**
 * Gera o HTML completo do email individual para um GT específico.
 * Não inclui informação global (Top 10 vendedores ou Ranking GT global).
 * Inclui:
 * 1. Cabeçalho normal do relatório
 * 2. Texto introdutório
 * 3. Identificação do GT selecionado (Nome GT)
 * 4. Gráfico "Vendedores com Anulações nos Últimos 5 Dias Úteis" (da equipa)
 * 5. Gráfico "Ranking da Equipa"
 * 6. Tabela completa da equipa (todos os vendedores, incluindo 0s)
 * 7. Bloco TOTAL GT (Últimos 5 Dias Úteis, Acumulado Ano, Número de Vendedores)
 * 8. Assinatura: Com os melhores cumprimentos, Equipa AFSN
 */
export function generateIndividualGtEmailHtml(
  result: ProcessingResult,
  gtGroup: GtGroup,
  options?: IndividualGtHtmlOptions
): string {
  const { businessDaysRange, processingDate } = result;
  const gtDisplayName = gtGroup.nomeGt || gtGroup.emailGt;

  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Filtra apenas os vendedores desta equipa GT com ultimos5DiasUteis > 0
  const teamActiveSellers5d = gtGroup.vendedores
    .filter((v) => v.ultimos5DiasUteis > 0)
    .sort((a, b) => {
      if (b.ultimos5DiasUteis !== a.ultimos5DiasUteis) {
        return b.ultimos5DiasUteis - a.ultimos5DiasUteis;
      }
      return a.nomeVendedor.localeCompare(b.nomeVendedor, 'pt');
    });

  const teamTotalAnulacoes5d = teamActiveSellers5d.reduce(
    (sum, v) => sum + v.ultimos5DiasUteis,
    0
  );

  const team5DiasImg =
    options?.team5DiasImg ??
    generateVendedores5DiasChartImage(
      teamActiveSellers5d,
      teamTotalAnulacoes5d,
      gtDisplayName
    );

  // Gera a imagem do gráfico da equipa se não fornecida
  const teamChartImg =
    options?.teamChartImg ??
    generateTeamRankingChartImage(gtGroup.vendedores, gtDisplayName);

  const team5DiasSrc = options?.isForEml ? 'cid:chart_vendedores_5dias_equipa' : team5DiasImg;
  const teamChartSrc = options?.isForEml ? 'cid:chart_ranking_equipa' : teamChartImg;

  // Linhas da tabela de vendedores da equipa
  const rowsHtml = gtGroup.vendedores
    .map((s) => {
      let rankBadgeBg = '#f3f4f6';
      let rankBadgeColor = '#374151';
      let rowBg = '#ffffff';
      let statusBadge = '';

      if (s.ultimos5DiasUteis === 0) {
        statusBadge = `<span style="display:inline-block; padding:2px 8px; font-size:11px; font-weight:600; border-radius:12px; background-color:#dcfce7; color:#15803d; border:1px solid #bbf7d0;">✓ 0 Anulações (5d)</span>`;
      }

      if (s.ranking <= 3 && s.acumuladoAno > 0) {
        rankBadgeBg = '#fee2e2';
        rankBadgeColor = '#b91c1c';
        rowBg = '#fff8f8';
      } else if (s.acumuladoAno > 0) {
        rankBadgeBg = '#fef3c7';
        rankBadgeColor = '#b45309';
      }

      const recentCellBg = s.ultimos5DiasUteis === 0 ? '#f0fdf4' : '#ffffff';
      const recentTextColor = s.ultimos5DiasUteis === 0 ? '#16a34a' : '#1f2937';

      return `
        <tr style="background-color:${rowBg}; border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 12px; text-align:center; font-weight:bold; font-size:13px; color:#111827;">
            <span style="display:inline-block; min-width:24px; padding:3px 8px; border-radius:12px; background-color:${rankBadgeBg}; color:${rankBadgeColor}; font-weight:700;">
              #${s.ranking}
            </span>
          </td>
          <td style="padding:10px 12px; text-align:left; font-family:'Courier New', monospace; font-weight:bold; color:#1e3a8a; font-size:13px;">
            ${s.codigo}
          </td>
          <td style="padding:10px 12px; text-align:left; font-size:13px; color:#1f2937;">
            <strong>${s.nomeVendedor}</strong>
            ${statusBadge ? `<div style="margin-top:3px;">${statusBadge}</div>` : ''}
          </td>
          <td style="padding:10px 12px; text-align:center; font-size:13px; font-weight:700; background-color:${recentCellBg}; color:${recentTextColor}; border-left:1px solid #f3f4f6; border-right:1px solid #f3f4f6;">
            ${s.ultimos5DiasUteis}
          </td>
          <td style="padding:10px 12px; text-align:center; font-size:13px; font-weight:700; color:#111827;">
            ${s.acumuladoAno}
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Semanal de Recibos Anulados | ${gtDisplayName}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1f2937; line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:760px; background-color:#ffffff; border-radius:10px; border:1px solid #e5e7eb; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <!-- Top Banner Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); background-color:#1e3a8a; padding:24px 28px; color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.3px;">
                      CONTROLO DE RECIBOS ANULADOS
                    </h1>
                    <div style="margin-top:6px; font-size:13px; color:#e0e7ff;">
                      Resumo Semanal de Recibos Anulados
                    </div>
                  </td>
                  <td style="text-align:right; vertical-align:middle;">
                    <div style="background-color:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); border-radius:6px; padding:6px 12px; display:inline-block; text-align:center;">
                      <div style="font-size:10px; text-transform:uppercase; color:#bfdbfe; font-weight:600;">Data Processamento</div>
                      <div style="font-size:13px; font-weight:700; color:#ffffff;">${formatDatePt(processingDate)}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo do Email -->
          <tr>
            <td style="padding:28px 28px 32px 28px; font-size:14px; color:#374151;">
              <p style="margin:0 0 16px 0; font-size:15px; color:#111827;">
                Boa tarde, ${gtDisplayName},
              </p>
              
              <p style="margin:0 0 14px 0; line-height:1.6;">
                Segue abaixo o resumo dos recibos anulados por vendedor da sua equipa.
              </p>
              
              <div style="background-color:#f8fafc; border-left:4px solid #3b82f6; border-radius:4px; padding:12px 16px; margin:0 0 16px 0;">
                <p style="margin:0 0 6px 0; font-weight:600; color:#1e293b;">Para cada vendedor são apresentados:</p>
                <ul style="margin:0; padding-left:20px; color:#475569;">
                  <li style="margin-bottom:4px;">
                    <strong>Recibos anulados nos últimos 5 dias úteis</strong> (${formatDatePt(businessDaysRange.start)} a ${formatDatePt(businessDaysRange.end)});
                  </li>
                  <li>
                    <strong>Recibos anulados acumulados desde o início do ano</strong> (desde 01/01/${processingDate.getFullYear()}).
                  </li>
                </ul>
              </div>

              <p style="margin:0 0 24px 0; line-height:1.6; color:#4b5563;">
                Esta informação pretende proporcionar uma visão consolidada da atividade de anulações e facilitar o acompanhamento dos pedidos de anulação efetuados pelos comerciais.
              </p>

              <!-- Identificação Visual do GT Selecionado -->
              <div style="margin:24px 0 18px 0; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="text-align:left; vertical-align:middle;">
                      <span style="font-size:16px; font-weight:800; color:#1e3a8a; letter-spacing:0.3px;">
                        GT: <span style="color:#1d4ed8;">${gtDisplayName}</span>
                      </span>
                    </td>
                    <td style="text-align:right; vertical-align:middle; color:#475569; font-size:12px;">
                      <span>Vendedores: <strong>${gtGroup.totalVendedores}</strong></span> |
                      <span>5 Dias: <strong>${gtGroup.totalUltimos5Dias}</strong></span> |
                      <span>Acumulado: <strong>${gtGroup.totalAcumuladoAno}</strong></span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- ============================================== -->
              <!-- GRÁFICO 1: Vendedores com Anulações nos Últimos 5 Dias Úteis (Equipa) -->
              <!-- ============================================== -->
              ${
                team5DiasSrc
                  ? `
              <div style="margin:0 0 28px 0; text-align:center;">
                <div style="font-size:13px; font-weight:700; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; text-align:left;">
                  Gráfico 1 &bull; Vendedores com Anulações nos Últimos 5 Dias Úteis (${gtDisplayName})
                </div>
                <img src="${team5DiasSrc}" alt="Vendedores com Anulações nos Últimos 5 Dias Úteis - ${gtDisplayName}" width="704" style="width:100%; max-width:704px; height:auto; display:block; margin:0 auto; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);" />
              </div>
              `
                  : ''
              }

              <!-- ============================================== -->
              <!-- GRÁFICO 2: Ranking da Equipa (Acumulado Ano)    -->
              <!-- ============================================== -->
              ${
                teamChartSrc
                  ? `
              <div style="margin:0 0 28px 0; text-align:center;">
                <div style="font-size:13px; font-weight:700; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; text-align:left;">
                  Gráfico 2 &bull; Ranking da Equipa (Acumulado Ano)
                </div>
                <img src="${teamChartSrc}" alt="Ranking da Equipa - ${gtDisplayName}" width="704" style="width:100%; max-width:704px; height:auto; display:block; margin:0 auto; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);" />
              </div>
              `
                  : ''
              }

              <!-- ============================================== -->
              <!-- TABELA DA EQUIPA                               -->
              <!-- ============================================== -->
              <div style="font-size:14px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin:28px 0 14px 0; border-top:2px solid #e2e8f0; padding-top:16px;">
                Tabela da Equipa &bull; ${gtDisplayName}
              </div>

              <div style="margin-bottom:24px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  <thead>
                    <tr style="background-color:#f8fafc; border-bottom:2px solid #cbd5e1; font-size:12px; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">
                      <th style="padding:10px 12px; text-align:center; width:70px;">Ranking</th>
                      <th style="padding:10px 12px; text-align:left; width:80px;">Código</th>
                      <th style="padding:10px 12px; text-align:left;">Vendedor</th>
                      <th style="padding:10px 12px; text-align:center; width:150px; background-color:#f1f5f9;">Últimos 5 Dias Úteis</th>
                      <th style="padding:10px 12px; text-align:center; width:130px;">Acumulado Ano</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color:#f1f5f9; font-weight:bold; border-top:2px solid #cbd5e1; font-size:12px; color:#1e293b;">
                      <td colspan="3" style="padding:10px 12px; text-align:right;">Subtotal ${gtDisplayName}:</td>
                      <td style="padding:10px 12px; text-align:center; color:#1e40af;">${gtGroup.totalUltimos5Dias}</td>
                      <td style="padding:10px 12px; text-align:center; color:#0f172a;">${gtGroup.totalAcumuladoAno}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- ============================================== -->
              <!-- BLOCO TOTAL GT                                 -->
              <!-- ============================================== -->
              <div style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px 20px; margin-bottom:28px;">
                <div style="font-size:13px; font-weight:800; color:#166534; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                  TOTAL GT
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px; color:#1e293b;">
                  <tr>
                    <td style="padding:4px 0;"><strong>Últimos 5 Dias Úteis:</strong> <span style="color:#15803d; font-weight:700;">${gtGroup.totalUltimos5Dias}</span></td>
                    <td style="padding:4px 0;"><strong>Acumulado Ano:</strong> <span style="color:#166534; font-weight:700;">${gtGroup.totalAcumuladoAno}</span></td>
                    <td style="padding:4px 0;"><strong>Número de Vendedores:</strong> <span style="font-weight:700;">${gtGroup.totalVendedores}</span></td>
                  </tr>
                </table>
              </div>

              <!-- Assinatura Final -->
              <p style="margin:28px 0 0 0; color:#111827; font-weight:600; line-height:1.6;">
                Com os melhores cumprimentos,<br><br>
                <span style="font-weight:600; color:#111827;">Equipa AFSN</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Gera a versão em texto simples do email individual do GT
 */
export function generateIndividualGtEmailPlainText(
  result: ProcessingResult,
  gtGroup: GtGroup
): string {
  const { businessDaysRange, processingDate } = result;
  const gtDisplayName = gtGroup.nomeGt || gtGroup.emailGt;

  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let text = `Boa tarde, ${gtDisplayName},\n\n`;
  text += `Segue abaixo o resumo dos recibos anulados por vendedor da sua equipa.\n\n`;
  text += `Para cada vendedor são apresentados:\n\n`;
  text += `• Recibos anulados nos últimos 5 dias úteis (${formatDatePt(businessDaysRange.start)} a ${formatDatePt(businessDaysRange.end)})\n`;
  text += `• Recibos anulados acumulados desde o início do ano (desde 01/01/${processingDate.getFullYear()})\n\n`;
  text += `Esta informação pretende proporcionar uma visão consolidada da atividade de anulações e facilitar o acompanhamento dos pedidos de anulação efetuados pelos comerciais.\n\n`;

  text += `====================================================\n`;
  text += `GT: ${gtDisplayName}\n`;
  text += `====================================================\n\n`;

  // Gráfico 1: Vendedores com Anulações nos Últimos 5 Dias Úteis (Equipa)
  text += `====================================================\n`;
  text += `GRÁFICO 1: VENDEDORES COM ANULAÇÕES NOS ÚLTIMOS 5 DIAS ÚTEIS (${gtDisplayName})\n`;
  text += `====================================================\n`;
  const teamActiveSellers5d = gtGroup.vendedores
    .filter((v) => v.ultimos5DiasUteis > 0)
    .sort((a, b) => {
      if (b.ultimos5DiasUteis !== a.ultimos5DiasUteis) {
        return b.ultimos5DiasUteis - a.ultimos5DiasUteis;
      }
      return a.nomeVendedor.localeCompare(b.nomeVendedor, 'pt');
    });

  if (teamActiveSellers5d.length === 0) {
    text += `Nenhum vendedor desta equipa com anulações nos últimos 5 dias úteis.\n`;
  } else {
    teamActiveSellers5d.forEach((v, idx) => {
      text += `${idx + 1}. [${v.codigo}] ${v.nomeVendedor} - 5d: ${v.ultimos5DiasUteis}\n`;
    });
  }
  text += `\n`;

  // Gráfico 2: Ranking da Equipa (Acumulado Ano)
  text += `====================================================\n`;
  text += `GRÁFICO 2: RANKING DA EQUIPA (ACUMULADO ANO)\n`;
  text += `====================================================\n`;
  gtGroup.vendedores.forEach((v, idx) => {
    text += `${idx + 1}. [${v.codigo}] ${v.nomeVendedor} - 5d: ${v.ultimos5DiasUteis} | Acumulado Ano: ${v.acumuladoAno}\n`;
  });
  text += `\n`;

  // Tabela da Equipa
  text += `====================================================\n`;
  text += `TABELA DA EQUIPA\n`;
  text += `====================================================\n`;
  text += `Ranking | Código | Vendedor               | Últimos 5 Dias | Acumulado Ano\n`;
  text += `----------------------------------------------------\n`;
  for (const s of gtGroup.vendedores) {
    const rank = String(s.ranking).padEnd(7);
    const code = s.codigo.padEnd(6);
    const name = s.nomeVendedor.slice(0, 22).padEnd(22);
    const ult5 = String(s.ultimos5DiasUteis).padStart(14);
    const acum = String(s.acumuladoAno).padStart(14);
    text += `${rank} | ${code} | ${name} | ${ult5} | ${acum}\n`;
  }
  text += `----------------------------------------------------\n\n`;

  // Total GT
  text += `TOTAL GT\n`;
  text += `Últimos 5 Dias Úteis: ${gtGroup.totalUltimos5Dias}\n`;
  text += `Acumulado Ano: ${gtGroup.totalAcumuladoAno}\n`;
  text += `Número de Vendedores: ${gtGroup.totalVendedores}\n\n`;

  text += `Com os melhores cumprimentos,\n\nEquipa AFSN\n`;

  return text;
}

/**
 * Monta o pacote de dados do email individual para um GT
 */
export function buildIndividualGtEmailData(
  result: ProcessingResult,
  gtGroup: GtGroup
): EmailData {
  const to = [gtGroup.emailGt.trim().toLowerCase()];
  const cc = FIXED_CC_EMAILS;
  const gtDisplayName = gtGroup.nomeGt || gtGroup.emailGt;
  const subject = `Resumo Semanal de Recibos Anulados | ${gtDisplayName}`;

  // Filtra apenas os vendedores desta equipa GT com ultimos5DiasUteis > 0
  const teamActiveSellers5d = gtGroup.vendedores
    .filter((v) => v.ultimos5DiasUteis > 0)
    .sort((a, b) => {
      if (b.ultimos5DiasUteis !== a.ultimos5DiasUteis) {
        return b.ultimos5DiasUteis - a.ultimos5DiasUteis;
      }
      return a.nomeVendedor.localeCompare(b.nomeVendedor, 'pt');
    });

  const teamTotalAnulacoes5d = teamActiveSellers5d.reduce(
    (sum, v) => sum + v.ultimos5DiasUteis,
    0
  );

  const team5DiasPng = generateVendedores5DiasChartImage(
    teamActiveSellers5d,
    teamTotalAnulacoes5d,
    gtDisplayName
  );

  const teamChartPng = generateTeamRankingChartImage(gtGroup.vendedores, gtDisplayName);

  const htmlBody = generateIndividualGtEmailHtml(result, gtGroup, {
    team5DiasImg: team5DiasPng,
    teamChartImg: teamChartPng,
    isForEml: false
  });

  const plainTextBody = generateIndividualGtEmailPlainText(result, gtGroup);

  const chartVendedores5DiasBase64 = team5DiasPng
    ? team5DiasPng.replace(/^data:image\/png;base64,/, '')
    : undefined;

  const chartTeamRankingBase64 = teamChartPng
    ? teamChartPng.replace(/^data:image\/png;base64,/, '')
    : undefined;

  return {
    to,
    cc,
    subject,
    htmlBody,
    plainTextBody,
    chartVendedores5DiasBase64,
    chartTeamRankingBase64
  };
}

/**
 * Gera o ficheiro .EML padrão RFC 822 para envio individual do GT.
 * Abre diretamente no Novo Outlook em modo de composição (X-Unsent: 1)
 * com o corpo HTML totalmente renderizado e os gráficos inline.
 */
export function generateIndividualGtEmlString(
  emailData: EmailData,
  result: ProcessingResult,
  gtGroup: GtGroup
): string {
  const boundaryRel = `----=_NextPart_Rel_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const dateStr = new Date().toUTCString();

  const toHeader = emailData.to.join(', ');
  const ccHeader = emailData.cc.join(', ');

  const hasCharts = Boolean(
    emailData.chartVendedores5DiasBase64 ||
    emailData.chartTeamRankingBase64
  );

  // Gera a versão HTML com Content-ID para EML
  const emlHtmlBody = generateIndividualGtEmailHtml(result, gtGroup, {
    isForEml: true
  });

  if (hasCharts) {
    const lines = [
      'X-Unsent: 1',
      'From: "Controlo de Recibos Anulados" <noreply@sumolcompal.pt>',
      `To: ${toHeader}`,
      `Cc: ${ccHeader}`,
      `Subject: ${encodeHeaderSubject(emailData.subject)}`,
      `Date: ${dateStr}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${boundaryRel}"`,
      '',
      'This is a multi-part message in MIME format.',
      '',
      `--${boundaryRel}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeMimeBase64(emlHtmlBody),
      ''
    ];

    if (emailData.chartVendedores5DiasBase64) {
      lines.push(
        `--${boundaryRel}`,
        'Content-Type: image/png; name="chart_vendedores_5dias_equipa.png"',
        'Content-Transfer-Encoding: base64',
        'Content-ID: <chart_vendedores_5dias_equipa>',
        'Content-Disposition: inline; filename="chart_vendedores_5dias_equipa.png"',
        '',
        encodeMimeBase64Raw(emailData.chartVendedores5DiasBase64),
        ''
      );
    }

    if (emailData.chartTeamRankingBase64) {
      lines.push(
        `--${boundaryRel}`,
        'Content-Type: image/png; name="chart_ranking_equipa.png"',
        'Content-Transfer-Encoding: base64',
        'Content-ID: <chart_ranking_equipa>',
        'Content-Disposition: inline; filename="chart_ranking_equipa.png"',
        '',
        encodeMimeBase64Raw(emailData.chartTeamRankingBase64),
        ''
      );
    }

    lines.push(`--${boundaryRel}--`, '');
    return lines.join('\r\n');
  }

  // Fallback caso não haja gráfico
  const boundaryMixed = `----=_NextPart_Mixed_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const lines = [
    'X-Unsent: 1',
    'From: "Controlo de Recibos Anulados" <noreply@sumolcompal.pt>',
    `To: ${toHeader}`,
    `Cc: ${ccHeader}`,
    `Subject: ${encodeHeaderSubject(emailData.subject)}`,
    `Date: ${dateStr}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundaryMixed}"`,
    '',
    'This is a multi-part message in MIME format.',
    '',
    `--${boundaryMixed}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimeBase64(emailData.plainTextBody),
    '',
    `--${boundaryMixed}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMimeBase64(emlHtmlBody),
    '',
    `--${boundaryMixed}--`,
    ''
  ];

  return lines.join('\r\n');
}
