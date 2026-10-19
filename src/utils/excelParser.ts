import * as XLSX from 'xlsx';
import { SapRawRow, SellerTemplate } from '../types';

/**
 * Normaliza qualquer valor de código de vendedor para string mantendo zeros à esquerda se numérico
 * Ex: 1 -> "001", 49 -> "049", "G04" -> "G04", "001" -> "001"
 */
export function normalizeSellerCode(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Se for apenas dígitos e tiver menos de 3 dígitos, pad com zeros
  if (/^\d+$/.test(str) && str.length < 3) {
    return str.padStart(3, '0');
  }
  return str;
}

/**
 * Tenta converter vários formatos de data do Excel (número serial, string ISO, formato pt-PT DD/MM/AAAA)
 */
export function parseExcelDate(val: unknown): Date | null {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  // Serial Excel (ex: 45678)
  if (typeof val === 'number') {
    // SheetJS util para converter serial para Date
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      return new Date(dateObj.y, dateObj.m - 1, dateObj.d, dateObj.H || 0, dateObj.M || 0, dateObj.S || 0);
    }
  }

  if (typeof val === 'string') {
    const s = val.trim();
    // Tenta formato DD/MM/AAAA ou DD-MM-AAAA
    const ptMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (ptMatch) {
      const day = parseInt(ptMatch[1], 10);
      const month = parseInt(ptMatch[2], 10) - 1;
      const year = parseInt(ptMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Tenta formato AAAA-MM-DD
    const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    const standardDate = new Date(s);
    if (!isNaN(standardDate.getTime())) return standardDate;
  }

  return null;
}

/**
 * Procura chaves no objeto independentemente de maiúsculas/minúsculas e acentuação
 */
function findKey(row: Record<string, unknown>, possibleNames: string[]): string | undefined {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const normTarget = normalize(name);
    for (const k of keys) {
      if (normalize(k) === normTarget) {
        return k;
      }
    }
  }
  // Fallback para includes
  for (const name of possibleNames) {
    const normTarget = normalize(name);
    for (const k of keys) {
      if (normalize(k).includes(normTarget)) {
        return k;
      }
    }
  }
  return undefined;
}

export interface SapParseResult {
  records: SapRawRow[];
  totalRowsRead: number;
  uniqueCount: number;
  duplicatesRemoved: number;
  duplicateDocs: string[];
  detectedColumns: {
    gvndCol: string;
    docCol: string;
    dateCol: string;
  };
}

/**
 * Lê e analisa o ficheiro Excel SAP
 * Remove duplicados por "Nº doc."
 * Garante que "GVnd" é tratado como texto.
 */
export async function parseSapExcel(file: File | ArrayBuffer | Uint8Array): Promise<SapParseResult> {
  let buffer: ArrayBuffer | Uint8Array;
  if (file instanceof File) {
    buffer = await file.arrayBuffer();
  } else {
    buffer = file;
  }
  // raw: false permite que formatos visuais (como zeros à esquerda em texto) sejam preservados
  const workbook = XLSX.read(buffer, { type: buffer instanceof Uint8Array ? 'array' : 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Converte para objetos JSON
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });

  if (rawRows.length === 0) {
    throw new Error('O ficheiro SAP não contém dados ou a folha está vazia.');
  }

  // Identifica colunas pelo cabeçalho da primeira linha
  const firstRow = rawRows[0];
  const gvndCol = findKey(firstRow, ['GVnd', 'Vendedor', 'Cod Vendedor', 'Cod. Vendedor', 'CodVendedor', 'Vnd']);
  const docCol = findKey(firstRow, ['Nº doc.', 'Nº doc', 'N.º doc.', 'No doc', 'Doc', 'Documento', 'Recibo', 'Nº Recibo']);
  const dateCol = findKey(firstRow, ['Data doc.', 'Data', 'Data registo', 'Data criacao', 'Data lancamento', 'Data anulação', 'Dt.Doc']);

  if (!gvndCol) {
    throw new Error('Coluna de vendedor "GVnd" não encontrada no ficheiro SAP.');
  }
  if (!docCol) {
    throw new Error('Coluna de número de recibo "Nº doc." não encontrada no ficheiro SAP.');
  }

  const seenDocs = new Set<string>();
  const duplicateDocs: string[] = [];
  const uniqueRecords: SapRawRow[] = [];

  let lineIndex = 2; // Linha Excel aproximada (1 é cabeçalho)
  for (const row of rawRows) {
    const rawGvnd = row[gvndCol];
    const rawDoc = row[docCol];
    const rawDate = dateCol ? row[dateCol] : undefined;

    const gvnd = normalizeSellerCode(rawGvnd);
    const numDoc = rawDoc !== undefined && rawDoc !== null ? String(rawDoc).trim() : '';

    // Se a linha não tiver número de doc nem vendedor, ignora
    if (!gvnd && !numDoc) {
      lineIndex++;
      continue;
    }

    // Regra de Deduplicação: "O mesmo recibo pode aparecer várias vezes. Considerar apenas uma ocorrência por 'Nº doc.'."
    if (numDoc) {
      if (seenDocs.has(numDoc)) {
        duplicateDocs.push(numDoc);
        lineIndex++;
        continue;
      }
      seenDocs.add(numDoc);
    }

    const parsedDate = parseExcelDate(rawDate) || new Date();

    // Colunas opcionais de contexto SAP
    const clienteKey = findKey(row, ['Cliente', 'Cod Cliente', 'Nº Cliente']);
    const nomeClienteKey = findKey(row, ['Nome', 'Nome Cliente', 'Designacao']);
    const montanteKey = findKey(row, ['Montante', 'Valor', 'Total', 'Valor Liquido']);
    const motivoKey = findKey(row, ['Motivo', 'Descricao', 'Obs', 'Observacoes', 'Texto']);

    const rawMontante = montanteKey ? row[montanteKey] : undefined;
    let montante = 0;
    if (typeof rawMontante === 'number') {
      montante = rawMontante;
    } else if (typeof rawMontante === 'string') {
      const sanitized = rawMontante.replace(/[^0-9,-.]/g, '').replace(',', '.');
      montante = parseFloat(sanitized) || 0;
    }

    uniqueRecords.push({
      gvnd,
      numDoc,
      data: parsedDate,
      rawDateStr: rawDate !== undefined ? String(rawDate) : undefined,
      cliente: clienteKey && row[clienteKey] ? String(row[clienteKey]) : undefined,
      nomeCliente: nomeClienteKey && row[nomeClienteKey] ? String(row[nomeClienteKey]) : undefined,
      montante,
      motivo: motivoKey && row[motivoKey] ? String(row[motivoKey]) : undefined,
      linhaOriginal: lineIndex
    });

    lineIndex++;
  }

  return {
    records: uniqueRecords,
    totalRowsRead: rawRows.length,
    uniqueCount: uniqueRecords.length,
    duplicatesRemoved: duplicateDocs.length,
    duplicateDocs,
    detectedColumns: {
      gvndCol: gvndCol || 'GVnd',
      docCol: docCol || 'Nº doc.',
      dateCol: dateCol || 'Data doc.'
    }
  };
}

/**
 * Lê e analisa o ficheiro Template_Emails.xlsx
 * Colunas: Codigo_3_digitos, Nome Vendedor, Email, Email GT
 */
export async function parseTemplateEmails(file: File | ArrayBuffer | Uint8Array): Promise<SellerTemplate[]> {
  let buffer: ArrayBuffer | Uint8Array;
  if (file instanceof File) {
    buffer = await file.arrayBuffer();
  } else {
    buffer = file;
  }
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false
  });

  if (rawRows.length === 0) {
    throw new Error('O ficheiro Template_Emails está vazio.');
  }

  const firstRow = rawRows[0];
  const codCol = findKey(firstRow, ['Codigo_3_digitos', 'Codigo', 'Código', 'GVnd', 'Cod Vendedor']);
  const nomeCol = findKey(firstRow, ['Nome Vendedor', 'Nome', 'Vendedor']);
  const emailCol = findKey(firstRow, ['Email', 'Email Vendedor', 'Correio']);
  const nomeGtCol = findKey(firstRow, ['Nome GT', 'NomeGT', 'GT Nome', 'Nome do GT', 'Gestor Território', 'Gestor']);
  const emailGtCol = findKey(firstRow, ['Email GT', 'EmailGT', 'GT Email', 'GT']);

  if (!codCol || !nomeCol || !emailGtCol) {
    throw new Error(
      'O ficheiro de Template deve conter as colunas: "Codigo_3_digitos", "Nome Vendedor" e "Email GT".'
    );
  }

  const templates: SellerTemplate[] = [];

  for (const row of rawRows) {
    const rawCod = row[codCol];
    const codigo = normalizeSellerCode(rawCod);
    const nomeVendedor = nomeCol && row[nomeCol] ? String(row[nomeCol]).trim() : '';
    const email = emailCol && row[emailCol] ? String(row[emailCol]).trim() : '';
    const nomeGt = nomeGtCol && row[nomeGtCol] ? String(row[nomeGtCol]).trim() : undefined;
    const emailGt = emailGtCol && row[emailGtCol] ? String(row[emailGtCol]).trim() : '';

    if (codigo && (nomeVendedor || emailGt)) {
      templates.push({
        codigo,
        nomeVendedor: nomeVendedor || `Vendedor ${codigo}`,
        email,
        nomeGt,
        emailGt: emailGt.toLowerCase()
      });
    }
  }

  return templates;
}

/**
 * Gera um ficheiro de exemplo SAP Excel em memória com dados realistas
 * Inclui recibos no ano corrente e alguns nos últimos 5 dias úteis, além de duplicados propositados.
 */
export function generateSampleSapWorkbook(referenceDate: Date = new Date()): Uint8Array {
  const formatDatePt = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const sampleRows: Array<{
    'GVnd': string;
    'Nº doc.': string;
    'Data doc.': string;
    'Cliente': string;
    'Nome Cliente': string;
    'Montante': number;
    'Motivo': string;
  }> = [];

  // Gera datas nos últimos dias úteis
  const refYear = referenceDate.getFullYear();
  const sellersData = [
    { gvnd: '001', name: 'Helder Barbosa', countYear: 15, count5Days: 2 },
    { gvnd: '002', name: 'Ana Ribeiro', countYear: 7, count5Days: 1 },
    { gvnd: '011', name: 'João Silva', countYear: 52, count5Days: 4 },
    { gvnd: '025', name: 'Ana Costa', countYear: 41, count5Days: 3 },
    { gvnd: '008', name: 'Pedro Santos', countYear: 27, count5Days: 1 },
    { gvnd: '005', name: 'Nuno Almeida', countYear: 18, count5Days: 3 },
    { gvnd: '049', name: 'Tiago Oliveira', countYear: 9, count5Days: 0 },
    { gvnd: 'G04', name: 'Gonçalo Matos', countYear: 12, count5Days: 2 },
    { gvnd: '135', name: 'Beatriz Pinto', countYear: 22, count5Days: 1 },
    { gvnd: '019', name: 'Manuel Sousa', countYear: 14, count5Days: 0 },
    { gvnd: 'G12', name: 'Ricardo Neves', countYear: 31, count5Days: 3 },
    { gvnd: '014', name: 'António Ferreira', countYear: 19, count5Days: 2 },
    { gvnd: '028', name: 'Inês Lourenço', countYear: 8, count5Days: 0 },
    { gvnd: '061', name: 'Bruno Teixeira', countYear: 26, count5Days: 2 },
    { gvnd: '007', name: 'Vasco Ramos', countYear: 34, count5Days: 2 },
    { gvnd: '031', name: 'Leonor Antunes', countYear: 11, count5Days: 0 },
    { gvnd: 'G07', name: 'Sara Fonseca', countYear: 16, count5Days: 1 }
  ];

  let docCounter = 90100;

  for (const s of sellersData) {
    // 1. Recibos nos últimos 5 dias úteis
    for (let i = 0; i < s.count5Days; i++) {
      docCounter++;
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - (1 + (i % 4)));
      // Garante dia útil
      if (d.getDay() === 0) d.setDate(d.getDate() - 2);
      if (d.getDay() === 6) d.setDate(d.getDate() - 1);

      sampleRows.push({
        'GVnd': s.gvnd,
        'Nº doc.': `REC-${refYear}-${docCounter}`,
        'Data doc.': formatDatePt(d),
        'Cliente': `CL-${1000 + (docCounter % 300)}`,
        'Nome Cliente': `Cliente Exemplo ${s.gvnd}-${i + 1}`,
        'Montante': 120.50 + (i * 45),
        'Motivo': i % 2 === 0 ? 'Erro de Faturação' : 'Recibo Emitido em Duplicado'
      });
    }

    // 2. Recibos anteriores ao longo do ano
    const remaining = s.countYear - s.count5Days;
    for (let j = 0; j < remaining; j++) {
      docCounter++;
      const d = new Date(refYear, (j % 9), 1 + (j * 2) % 25);
      sampleRows.push({
        'GVnd': s.gvnd,
        'Nº doc.': `REC-${refYear}-${docCounter}`,
        'Data doc.': formatDatePt(d),
        'Cliente': `CL-${2000 + (docCounter % 400)}`,
        'Nome Cliente': `Estabelecimento Comercial ${s.gvnd}-${j + 1}`,
        'Montante': 85.00 + (j * 20),
        'Motivo': 'Anulação Solicitada pelo Cliente'
      });
    }
  }

  // 3. Adiciona propositadamente 6 linhas duplicadas para testar o filtro de deduplicação
  if (sampleRows.length > 5) {
    sampleRows.push({ ...sampleRows[0] });
    sampleRows.push({ ...sampleRows[1] });
    sampleRows.push({ ...sampleRows[2] });
    sampleRows.push({ ...sampleRows[3] });
  }

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SAP_Recibos_Anulados');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
}

/**
 * Gera o ficheiro Template_Emails.xlsx a partir de uma lista de vendedores
 */
export function generateTemplateEmailsWorkbook(templates: SellerTemplate[]): Uint8Array {
  const rows = templates.map((t) => ({
    'Codigo_3_digitos': t.codigo,
    'Nome Vendedor': t.nomeVendedor,
    'Email': t.email,
    'Nome GT': t.nomeGt || t.emailGt,
    'Email GT': t.emailGt
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Emails');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
}
