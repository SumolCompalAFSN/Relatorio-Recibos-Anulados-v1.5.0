import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { ProcessingResult, GtGroup } from '../types';
import {
  buildEmailData,
  generateEmlString,
  buildIndividualGtEmailData,
  generateIndividualGtEmlString
} from './emailGenerator';

/**
 * Dispara o download de um ficheiro Blob no browser
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Cria a folha de Excel consolidada com múltiplas sheets
 */
export function buildExcelReportWorkbook(result: ProcessingResult): Uint8Array {
  const wb = XLSX.utils.book_new();
  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // 1. Sheet Resumo por GT
  const summaryRows: Array<{
    'GT': string;
    'Email GT': string;
    'Ranking no GT': number;
    'Código Vendedor': string;
    'Nome Vendedor': string;
    'Últimos 5 Dias Úteis': number;
    'Acumulado Ano': number;
    'Destaque': string;
  }> = [];

  for (const group of result.gtGroups) {
    const gtDisplayName = group.nomeGt || group.emailGt;
    for (const s of group.vendedores) {
      let destaqueDesc = 'Intermédio';
      if (s.ultimos5DiasUteis === 0) destaqueDesc = 'Verde (0 em 5 dias)';
      else if (s.ranking <= 3) destaqueDesc = 'Vermelho (Top 3 GT)';

      summaryRows.push({
        'GT': gtDisplayName,
        'Email GT': group.emailGt,
        'Ranking no GT': s.ranking,
        'Código Vendedor': s.codigo,
        'Nome Vendedor': s.nomeVendedor,
        'Últimos 5 Dias Úteis': s.ultimos5DiasUteis,
        'Acumulado Ano': s.acumuladoAno,
        'Destaque': destaqueDesc
      });
    }
  }
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo_por_GT');

  // 2. Sheet Totais por GT
  const gtTotalsRows = result.gtGroups.map((g, idx) => ({
    'Posição': idx + 1,
    'Nome GT': g.nomeGt || g.emailGt,
    'Email GT': g.emailGt,
    'Total Vendedores': g.totalVendedores,
    'Total Últimos 5 Dias': g.totalUltimos5Dias,
    'Total Acumulado Ano': g.totalAcumuladoAno
  }));
  const wsGt = XLSX.utils.json_to_sheet(gtTotalsRows);
  XLSX.utils.book_append_sheet(wb, wsGt, 'Totais_por_GT');

  // 3. Sheet Dados Desduplicados SAP
  const dedupRows = result.allReceipts.map((r) => ({
    'Código Vendedor (GVnd)': r.gvnd,
    'Nº doc. (Recibo Único)': r.numDoc,
    'Data Documento': formatDatePt(r.data),
    'Cliente': r.cliente || '',
    'Nome Cliente': r.nomeCliente || '',
    'Montante': r.montante || 0,
    'Motivo Anulação': r.motivo || ''
  }));
  const wsRaw = XLSX.utils.json_to_sheet(dedupRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Recibos_Desduplicados');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
}

/**
 * Gera e transfere o ficheiro ZIP completo
 * Contém: HTML, EML, XLSX e README
 */
export async function downloadZipPackage(result: ProcessingResult): Promise<void> {
  const zip = new JSZip();
  const emailData = buildEmailData(result);
  const emlContent = generateEmlString(emailData, result);
  const excelBuffer = buildExcelReportWorkbook(result);

  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // 1. HTML
  zip.file('Resumo_Recibos_Anulados.html', emailData.htmlBody);

  // 2. EML (abre direto no Outlook / Thunderbird / Apple Mail)
  zip.file('Resumo_Recibos_Anulados.eml', emlContent);

  // 3. Excel Relatório Consolidado
  zip.file('Relatorio_Recibos_Anulados.xlsx', excelBuffer);

  // 4. README de Auditoria
  const readmeContent = `CONTROLO DE RECIBOS ANULADOS
Processamento efetuado a: ${formatDatePt(result.processingDate)}
Período 5 Dias Úteis: ${result.businessDaysRange.formattedRange}
Início do Ano: 01/01/${result.processingDate.getFullYear()}

ESTATÍSTICAS GERAIS:
- Total de Recibos Anulados (Únicos): ${result.kpis.totalRecibosAnulados}
- Total de GT Envolvidos: ${result.kpis.totalGtEnvolvidos}
- Total de Vendedores com Anulações: ${result.kpis.totalVendedoresComAnulacoes}
- Vendedores com 0 anulações nos 5 dias úteis: ${result.kpis.totalVendedoresZeroRecente}

DESTINATÁRIOS DO EMAIL:
TO:
${emailData.to.map((m) => ` - ${m}`).join('\n')}

CC:
${emailData.cc.map((m) => ` - ${m}`).join('\n')}

Ficheiros incluídos neste pacote:
1. Resumo_Recibos_Anulados.html - Código HTML para visualização ou envio
2. Resumo_Recibos_Anulados.eml  - Ficheiro de email pronto a abrir no Outlook
3. Relatorio_Recibos_Anulados.xlsx - Folha de cálculo com resumos por GT e recibos desduplicados
4. README_Processamento.txt     - Este documento de conferência
`;
  zip.file('README_Processamento.txt', readmeContent);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `Controlo_Recibos_Anulados_${result.processingDate.toISOString().slice(0, 10)}.zip`;
  triggerDownload(zipBlob, filename);
}

/**
 * Transfere apenas o ficheiro .EML
 */
export function downloadEmlFile(result: ProcessingResult): void {
  const emailData = buildEmailData(result);
  const emlContent = generateEmlString(emailData, result);
  const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
  const filename = `Resumo_Recibos_Anulados_${result.processingDate.toISOString().slice(0, 10)}.eml`;
  triggerDownload(blob, filename);
}

/**
 * Transfere apenas o ficheiro .HTML
 */
export function downloadHtmlFile(result: ProcessingResult): void {
  const emailData = buildEmailData(result);
  const blob = new Blob([emailData.htmlBody], { type: 'text/html;charset=utf-8' });
  const filename = `Resumo_Recibos_Anulados_${result.processingDate.toISOString().slice(0, 10)}.html`;
  triggerDownload(blob, filename);
}

/**
 * Transfere apenas o ficheiro .XLSX consolidado
 */
export function downloadExcelReport(result: ProcessingResult): void {
  const excelBuffer = buildExcelReportWorkbook(result);
  const blob = new Blob([excelBuffer.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const filename = `Relatorio_Recibos_Anulados_${result.processingDate.toISOString().slice(0, 10)}.xlsx`;
  triggerDownload(blob, filename);
}

/**
 * Copia para a área de transferência como HTML formatado (Rich Text)
 * Permite colar direto com tabelas e estilos estilizados no Outlook / Gmail Web
 */
export async function copyRichTextToClipboard(result: ProcessingResult): Promise<boolean> {
  const emailData = buildEmailData(result);
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const htmlBlob = new Blob([emailData.htmlBody], { type: 'text/html' });
      const textBlob = new Blob([emailData.plainTextBody], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      await navigator.clipboard.writeText(emailData.htmlBody);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, falling back to text copy', err);
    try {
      await navigator.clipboard.writeText(emailData.plainTextBody);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Abre diretamente o Novo Outlook para Windows com uma nova mensagem
 * criada e formatada em HTML com TO, CC e Assunto pré-preenchidos (Técnica RVV).
 * Utiliza o standard .EML com cabeçalho X-Unsent: 1 e MIME multipart/alternative.
 */
export function openOutlookDraftMessage(result: ProcessingResult): void {
  const emailData = buildEmailData(result);
  const emlContent = generateEmlString(emailData, result);
  const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
  triggerDownload(blob, 'Resumo_Semanal_Recibos_Anulados.eml');
}

/**
 * Abre diretamente o Novo Outlook para Windows com uma nova mensagem
 * formatada em HTML apenas para a equipa do GT selecionado (Técnica RVV).
 * Preenche TO (Email GT), CC, Assunto e corpo formatado em HTML com gráfico inline.
 */
export function openIndividualGtOutlookDraft(
  result: ProcessingResult,
  gtGroup: GtGroup
): void {
  const emailData = buildIndividualGtEmailData(result, gtGroup);
  const emlContent = generateIndividualGtEmlString(emailData, result, gtGroup);
  const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
  const sanitizedName = (gtGroup.nomeGt || gtGroup.emailGt)
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
    .replace(/_+/g, '_');
  const filename = `Resumo_Recibos_Anulados_${sanitizedName}.eml`;
  triggerDownload(blob, filename);
}

/**
 * Transfere o ficheiro .EML individual de um GT
 */
export function downloadIndividualGtEmlFile(
  result: ProcessingResult,
  gtGroup: GtGroup
): void {
  const emailData = buildIndividualGtEmailData(result, gtGroup);
  const emlContent = generateIndividualGtEmlString(emailData, result, gtGroup);
  const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
  const sanitizedName = (gtGroup.nomeGt || gtGroup.emailGt)
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
    .replace(/_+/g, '_');
  const filename = `Resumo_Recibos_Anulados_${sanitizedName}_${result.processingDate.toISOString().slice(0, 10)}.eml`;
  triggerDownload(blob, filename);
}

/**
 * Transfere o ficheiro .HTML individual de um GT
 */
export function downloadIndividualGtHtmlFile(
  result: ProcessingResult,
  gtGroup: GtGroup
): void {
  const emailData = buildIndividualGtEmailData(result, gtGroup);
  const blob = new Blob([emailData.htmlBody], { type: 'text/html;charset=utf-8' });
  const sanitizedName = (gtGroup.nomeGt || gtGroup.emailGt)
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
    .replace(/_+/g, '_');
  const filename = `Resumo_Recibos_Anulados_${sanitizedName}_${result.processingDate.toISOString().slice(0, 10)}.html`;
  triggerDownload(blob, filename);
}

