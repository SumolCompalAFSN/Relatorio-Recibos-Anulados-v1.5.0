/**
 * Definições de Tipos para o Controlo de Recibos Anulados
 */

export interface SapRawRow {
  gvnd: string; // Código vendedor (texto, ex: "001", "049", "G04")
  numDoc: string; // Nº doc. (recibo)
  data: Date; // Data do documento / anulação
  rawDateStr?: string;
  cliente?: string;
  nomeCliente?: string;
  montante?: number;
  motivo?: string;
  linhaOriginal?: number;
}

export interface SellerTemplate {
  codigo: string; // Codigo_3_digitos (tratado sempre como texto)
  nomeVendedor: string;
  email: string;
  nomeGt?: string; // Nome GT (novo campo)
  emailGt: string; // Email GT (chave de agrupamento e envio)
}

export interface SellerSummary {
  ranking: number;
  codigo: string;
  nomeVendedor: string;
  email: string;
  nomeGt: string; // Nome GT (apresentação visual)
  emailGt: string; // Email GT (agrupamento e envio)
  ultimos5DiasUteis: number;
  acumuladoAno: number;
  highlightStatus: 'top3' | 'intermediate' | 'zeroRecent';
  receipts: SapRawRow[];
}

export interface GtGroup {
  emailGt: string; // Chave de agrupamento
  nomeGt: string; // Nome de apresentação visual (fallback para emailGt)
  totalVendedores: number;
  totalUltimos5Dias: number;
  totalAcumuladoAno: number;
  vendedores: SellerSummary[];
}

export interface ProcessingKpis {
  totalRecibosAnulados: number; // Únicos desduplicados
  totalLinhasLidas: number;
  totalDuplicadosIgnorados: number;
  totalVendedoresComAnulacoes: number;
  totalGtEnvolvidos: number;
  totalVendedoresZeroRecente: number;
  top10Vendedores: {
    codigo: string;
    nome: string;
    gt: string; // Nome GT
    emailGt: string;
    acumulado: number;
    ultimos5Dias: number;
  }[];
  top10Gts: {
    emailGt: string;
    nomeGt: string; // Nome GT
    acumulado: number;
    ultimos5Dias: number;
    vendedoresCount: number;
  }[];
  rankingGts: {
    emailGt: string;
    nomeGt: string; // Nome GT
    acumulado: number;
    ultimos5Dias: number;
    vendedoresCount: number;
  }[];
}

export interface ProcessingResult {
  processingDate: Date;
  businessDaysRange: {
    start: Date;
    end: Date;
    daysList: Date[];
    formattedRange: string;
  };
  yearStart: Date;
  kpis: ProcessingKpis;
  gtGroups: GtGroup[];
  allReceipts: SapRawRow[];
  unmappedSellers: string[];
  chartImages?: {
    vendedores5DiasPng?: string;
    top10VendedoresPng?: string;
    rankingGtPng?: string;
  };
}
