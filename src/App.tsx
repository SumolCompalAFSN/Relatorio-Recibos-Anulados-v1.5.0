import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileCheck,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Mail,
  Archive,
  Download,
  Info
} from 'lucide-react';
import { Header } from './components/Header';
import { FileUploadSection } from './components/FileUploadSection';
import { KpiCards } from './components/KpiCards';
import { ChartsSection } from './components/ChartsSection';
import { GtConsolidatedTable } from './components/GtConsolidatedTable';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { ReceiptDetailsModal } from './components/ReceiptDetailsModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';

import { SellerTemplate, SapRawRow, ProcessingResult, SellerSummary, GtGroup } from './types';
import { DEFAULT_SELLERS_TEMPLATE } from './data/defaultTemplate';
import {
  parseSapExcel,
  parseTemplateEmails,
  SapParseResult
} from './utils/excelParser';
import { aggregateSapData } from './utils/aggregator';
import {
  downloadZipPackage,
  downloadEmlFile,
  downloadExcelReport,
  openOutlookDraftMessage,
  openIndividualGtOutlookDraft,
  triggerDownload
} from './utils/exporter';

export default function App() {
  // Estado dos Templates de Vendedores
  const [templates, setTemplates] = useState<SellerTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('controlo_recibos_templates');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_SELLERS_TEMPLATE;
  });

  // Estado dos Dados SAP
  const [sapRecords, setSapRecords] = useState<SapRawRow[]>([]);
  const [parseInfo, setParseInfo] = useState<SapParseResult | null>(null);
  const [processingDate, setProcessingDate] = useState<Date>(() => new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros e Seleção
  const [selectedGtFilter, setSelectedGtFilter] = useState<string>('');
  const [selectedSellerForAudit, setSelectedSellerForAudit] = useState<SellerSummary | null>(null);

  // Modais
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [previewTargetGt, setPreviewTargetGt] = useState<GtGroup | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Grava templates no localStorage
  const handleSaveTemplates = (updated: SellerTemplate[]) => {
    setTemplates(updated);
    try {
      localStorage.setItem('controlo_recibos_templates', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Cálculo da agregação principal
  const processingResult = useMemo<ProcessingResult | null>(() => {
    if (sapRecords.length === 0) return null;
    return aggregateSapData(sapRecords, templates, {
      referenceDate: processingDate,
      includeReferenceDateIn5Days: false,
      showZeroActivitySellers: false
    });
  }, [sapRecords, templates, processingDate]);

  
  
  // Upload de ficheiro Excel SAP
  const handleSapFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await parseSapExcel(file);
      setSapRecords(result.records);
      setParseInfo(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar ficheiro Excel SAP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de ficheiro Template_Emails.xlsx
  const handleTemplateFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const parsedTemplates = await parseTemplateEmails(file);
      handleSaveTemplates(parsedTemplates);
      setSuccessNotification(`Template atualizado com sucesso! ${parsedTemplates.length} vendedores carregados.`);
      setTimeout(() => setSuccessNotification(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar ficheiro Template_Emails.xlsx.');
    } finally {
      setIsLoading(false);
    }
  };

  

  // Envio de email para o Novo Outlook para Windows (Técnica RVV)
  // Gera o rascunho com X-Unsent: 1 e HTML formatado, permitindo revisão manual e clique em Enviar
  const handleSendEmail = () => {
    if (!processingResult) return;
    openOutlookDraftMessage(processingResult);
    setSuccessNotification(
      'Email gerado com sucesso! A abrir nova mensagem no Novo Outlook para Windows com cabeçalhos, tabelas e cores formatadas em HTML.'
    );
    setTimeout(() => setSuccessNotification(null), 6000);
    
  };

  // Envio de email individual por GT para o Novo Outlook para Windows (Técnica RVV)
  const handleSendIndividualGt = (gtGroup: GtGroup) => {
    if (!processingResult) return;
    openIndividualGtOutlookDraft(processingResult, gtGroup);
    const gtName = gtGroup.nomeGt || gtGroup.emailGt;
    setSuccessNotification(
      `Email individual para ${gtName} gerado com sucesso! A abrir nova mensagem no Novo Outlook com gráfico da equipa e tabela formatada.`
    );
    setTimeout(() => setSuccessNotification(null), 6000);
   
  };

  const handleOpenEmailPreview = (targetGt?: GtGroup) => {
    setPreviewTargetGt(targetGt || null);
    setIsEmailPreviewOpen(true);
  };

  // Exportação EML direta
  const handleDownloadEml = () => {
    if (!processingResult) return;
    downloadEmlFile(processingResult);
  };

  // Exportação ZIP completa
  const handleDownloadZip = () => {
    if (!processingResult) return;
    downloadZipPackage(processingResult);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      
      {/* Top Header */}
      <Header
        processingDate={processingDate}
        onDateChange={setProcessingDate}
        result={processingResult}
        onOpenEmailPreview={handleOpenEmailPreview}
        onSendEmail={handleSendEmail}
        onSendIndividualGt={handleSendIndividualGt}
        onDownloadZip={handleDownloadZip}
        onDownloadEml={handleDownloadEml}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        hasData={sapRecords.length > 0}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Success notification if any */}
        {successNotification && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
            <span className="font-semibold">{successNotification}</span>
            <button
              type="button"
              onClick={() => setSuccessNotification(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Error notification if any */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Erro no processamento do ficheiro:</strong>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="ml-auto text-rose-500 hover:text-rose-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload & Setup Section */}
        <FileUploadSection
          onSapFileUpload={handleSapFileUpload}
          onTemplateFileUpload={handleTemplateFileUpload}
          isLoading={isLoading}
          parseInfo={parseInfo}
          processingResult={processingResult}
          templatesCount={templates.length}
        />

        {/* Processing Results & Dashboard */}
        {processingResult && (
          <>
            {/* KPI Overview Cards */}
            <KpiCards
              kpis={processingResult.kpis}
              totalUltimos5Dias={processingResult.gtGroups.reduce(
                (sum, g) => sum + g.totalUltimos5Dias,
                0
              )}
            />

            {/* Visual Charts: Top 10 Vendedores & Top 10 GT */}
            <ChartsSection
              kpis={processingResult.kpis}
              gtGroups={processingResult.gtGroups}
              onSelectSellerCode={(code) => {
                // Procura vendedor e abre auditoria
                for (const g of processingResult.gtGroups) {
                  const found = g.vendedores.find((s) => s.codigo === code);
                  if (found) {
                    setSelectedSellerForAudit(found);
                    break;
                  }
                }
              }}
              onSelectGt={(gt) => setSelectedGtFilter(gt)}
            />

            {/* Consolidated GT Table with Rankings and Highlights */}
            <GtConsolidatedTable
              gtGroups={processingResult.gtGroups}
              selectedGtFilter={selectedGtFilter}
              onSelectGtFilter={setSelectedGtFilter}
              onOpenReceiptDetails={(seller) => setSelectedSellerForAudit(seller)}
              onSendIndividualGt={handleSendIndividualGt}
            />
          </>
        )}

        {/* If no data loaded */}
        {!processingResult && !isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Nenhum ficheiro SAP carregado
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
              Carregue um ficheiro SAP para visualizar os indicadores e relatórios.
            </p>
            
          </div>
        )}
      </main>

      {/* Modals */}
      {processingResult && (
        <EmailPreviewModal
          isOpen={isEmailPreviewOpen}
          onClose={() => {
            setIsEmailPreviewOpen(false);
            setPreviewTargetGt(null);
          }}
          result={processingResult}
          initialGtGroup={previewTargetGt}
          onSendEmail={handleSendEmail}
          onSendIndividualGt={handleSendIndividualGt}
        />
      )}

      {selectedSellerForAudit && processingResult && (
        <ReceiptDetailsModal
          seller={selectedSellerForAudit}
          onClose={() => setSelectedSellerForAudit(null)}
          referenceDate={processingDate}
          businessDaysRange={processingResult.businessDaysRange}
        />
      )}

      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onSaveTemplates={handleSaveTemplates}
        onUploadFile={handleTemplateFileUpload}
      />

    </div>
  );
}
