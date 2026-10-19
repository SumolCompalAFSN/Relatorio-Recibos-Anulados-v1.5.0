import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Calendar
} from 'lucide-react';
import { SapParseResult } from '../utils/excelParser';
import { ProcessingResult } from '../types';

interface FileUploadSectionProps {
  onSapFileUpload: (file: File) => void;
  onTemplateFileUpload: (file: File) => void;
  isLoading: boolean;
  parseInfo: SapParseResult | null;
  processingResult: ProcessingResult | null;
  templatesCount: number;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onSapFileUpload,
  onTemplateFileUpload,
  isLoading,
  parseInfo,
  processingResult,
  templatesCount
}) => {
  const [isDraggingSap, setIsDraggingSap] = useState(false);
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);
  const sapInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  const handleSapDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSap(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onSapFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleTemplateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTemplate(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onTemplateFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Main Upload Area: SAP Excel */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              1. Ficheiro SAP de Recibos Anulados (Excel)
            </label>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingSap(true);
            }}
            onDragLeave={() => setIsDraggingSap(false)}
            onDrop={handleSapDrop}
            onClick={() => sapInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center flex-1 min-h-[140px] ${
              isDraggingSap
                ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                : parseInfo
                ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
            }`}
          >
            <input
              ref={sapInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onSapFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-slate-800">
              {isLoading ? 'A processar ficheiro...' : 'Arrasta o ficheiro Excel SAP aqui ou clica para procurar'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Formatos suportados: XLSX, XLS
            </p>
          </div>   
        </div>

        {/* Secondary Box: Template Vendedores / GT Mapping */}
        <div className="flex-1 flex flex-col">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                2. Template de Vendedores & GT
              </label>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                {templatesCount} registados
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingTemplate(true);
              }}
              onDragLeave={() => setIsDraggingTemplate(false)}
              onDrop={handleTemplateDrop}
              onClick={() => templateInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all text-xs min-h-[160px] flex flex-col items-center justify-center ${
                isDraggingTemplate
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-300 hover:border-emerald-400 bg-white'
              }`}
            >
              <input
                ref={templateInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onTemplateFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
  <FileCheck className="w-6 h-6" />
</div>
              <span className="font-semibold text-slate-700 block">Template_Emails.xlsx</span>
              <span className="text-[11px] text-slate-500">Clique para atualizar</span>
            </div>
          </div>

          
        </div>

      </div>

      {/* Deduplication & Business Rules Confirmation Banner */}
      {parseInfo && processingResult && (
        <div className="mt-5 p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Ficheiro SAP Processado com Sucesso
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  {parseInfo.uniqueCount} Recibos Únicos
                </span>
               
              </div>
              
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-blue-300">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>
                Últimos 5 Dias Úteis:{' '}
                <strong className="text-white">
                  {formatDatePt(processingResult.businessDaysRange.start)} a{' '}
                  {formatDatePt(processingResult.businessDaysRange.end)}
                </strong>
              </span>
            </div>
            <div className="h-3 w-px bg-slate-700 hidden sm:block" />
            <div className="text-slate-300">
              Ano: <strong className="text-white">Desde 01/01/{processingResult.processingDate.getFullYear()}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
