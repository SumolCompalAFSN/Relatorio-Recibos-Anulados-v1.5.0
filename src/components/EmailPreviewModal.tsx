import React, { useState } from 'react';
import {
  X,
  Mail,
  Copy,
  Download,
  Archive,
  Check,
  ExternalLink,
  Code2,
  Eye,
  FileText,
  Monitor,
  Smartphone,
  Send
} from 'lucide-react';
import { ProcessingResult, GtGroup } from '../types';
import {
  buildEmailData,
  generateEmlString,
  buildIndividualGtEmailData,
  generateIndividualGtEmlString
} from '../utils/emailGenerator';
import {
  copyRichTextToClipboard,
  downloadEmlFile,
  downloadHtmlFile,
  downloadZipPackage,
  openIndividualGtOutlookDraft,
  downloadIndividualGtEmlFile
} from '../utils/exporter';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ProcessingResult;
  initialGtGroup?: GtGroup | null;
  onSendEmail?: () => void;
  onSendIndividualGt?: (gtGroup: GtGroup) => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  result,
  initialGtGroup,
  onSendEmail,
  onSendIndividualGt
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'text'>('preview');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedSuccess, setCopiedSuccess] = useState<string | null>(null);
  const [selectedGtEmail, setSelectedGtEmail] = useState<string>(initialGtGroup?.emailGt || 'ALL');

  React.useEffect(() => {
    if (initialGtGroup) {
      setSelectedGtEmail(initialGtGroup.emailGt);
    } else {
      setSelectedGtEmail('ALL');
    }
  }, [initialGtGroup, isOpen]);

  if (!isOpen) return null;

  const selectedGtGroup =
    selectedGtEmail !== 'ALL'
      ? result.gtGroups.find((g) => g.emailGt === selectedGtEmail) || null
      : null;

  const emailData = selectedGtGroup
    ? buildIndividualGtEmailData(result, selectedGtGroup)
    : buildEmailData(result);

  const handleCopyRichText = async () => {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const htmlBlob = new Blob([emailData.htmlBody], { type: 'text/html' });
        const textBlob = new Blob([emailData.plainTextBody], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });
        await navigator.clipboard.write([item]);
        setCopiedSuccess('rich');
        setTimeout(() => setCopiedSuccess(null), 3000);
      } else {
        await navigator.clipboard.writeText(emailData.htmlBody);
        setCopiedSuccess('rich');
        setTimeout(() => setCopiedSuccess(null), 3000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(emailData.plainTextBody);
        setCopiedSuccess('rich');
        setTimeout(() => setCopiedSuccess(null), 3000);
      } catch {
        // ignore
      }
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(emailData.htmlBody);
      setCopiedSuccess('html');
      setTimeout(() => setCopiedSuccess(null), 3000);
    } catch {
      // fallback
    }
  };

  const handleSendCurrent = () => {
    onClose();
    if (selectedGtGroup) {
      if (onSendIndividualGt) {
        onSendIndividualGt(selectedGtGroup);
      } else {
        openIndividualGtOutlookDraft(result, selectedGtGroup);
      }
    } else {
      if (onSendEmail) {
        onSendEmail();
      }
    }
  };

  const handleDownloadCurrentEml = () => {
    if (selectedGtGroup) {
      downloadIndividualGtEmlFile(result, selectedGtGroup);
    } else {
      downloadEmlFile(result);
    }
  };

  const handleOpenMailto = () => {
    const toStr = emailData.to.join(';');
    const ccStr = emailData.cc.join(';');
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.plainTextBody);
    window.location.href = `mailto:${toStr}?cc=${ccStr}&subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white ${selectedGtGroup ? 'bg-indigo-600' : 'bg-blue-600'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>{selectedGtGroup ? `Email Individual • ${selectedGtGroup.nomeGt || selectedGtGroup.emailGt}` : 'Email Consolidado (Todos os GTs)'}</span>
                {selectedGtGroup && (
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold">
                    Individual GT
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedGtGroup
                  ? `Destinatário único: ${selectedGtGroup.emailGt} com CC institucional`
                  : 'Destinatários: Todos os GTs distintos com CC corporativo da Sumol+Compal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Modo: Geral vs GT Específico */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 font-medium">Relatório:</span>
              <select
                value={selectedGtEmail}
                onChange={(e) => setSelectedGtEmail(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-slate-900 text-white">Geral (Todos os GTs)</option>
                {result.gtGroups.map((g) => (
                  <option key={g.emailGt} value={g.emailGt} className="bg-slate-900 text-white">
                    GT: {g.nomeGt || g.emailGt}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Header Meta: TO, CC, Subject */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 text-xs space-y-2">
          {/* TO Field */}
          <div className="flex items-start gap-3">
            <span className="font-bold text-slate-500 w-16 pt-1 text-right shrink-0 uppercase tracking-wider text-[11px]">
              Para (TO):
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1 items-center">
              {emailData.to.length === 0 ? (
                <span className="text-slate-400 italic">Nenhum email de GT encontrado</span>
              ) : (
                emailData.to.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200 font-medium font-mono text-[11px]"
                  >
                    {email}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* CC Field */}
          <div className="flex items-start gap-3">
            <span className="font-bold text-slate-500 w-16 pt-1 text-right shrink-0 uppercase tracking-wider text-[11px]">
              CC:
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1 items-center">
              {emailData.cc.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 font-medium font-mono text-[11px]"
                >
                  {email}
                </span>
              ))}
            </div>
          </div>

          {/* Subject Field */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-500 w-16 text-right shrink-0 uppercase tracking-wider text-[11px]">
              Assunto:
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {emailData.subject}
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Visualização
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('html')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition ${
                activeTab === 'html'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Código HTML
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition ${
                activeTab === 'text'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Texto Simples
            </button>
          </div>

          {/* Device switcher in preview mode */}
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`p-1 rounded transition ${
                  deviceMode === 'desktop' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Vista Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`p-1 rounded transition ${
                  deviceMode === 'mobile' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Vista Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Export & Copy Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSendCurrent}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold transition shadow-xs ring-1 ${
                selectedGtGroup
                  ? 'bg-indigo-600 hover:bg-indigo-500 ring-indigo-400/30'
                  : 'bg-blue-600 hover:bg-blue-500 ring-blue-400/30'
              }`}
              title="Criar nova mensagem com formatação HTML completa no Novo Outlook para Windows (Técnica RVV)"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{selectedGtGroup ? `Enviar GT (${selectedGtGroup.nomeGt || selectedGtGroup.emailGt})` : 'Enviar Email'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyRichText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition shadow-xs"
              title="Copia o email formatado pronto a colar no Outlook ou Gmail mantendo estilos e cores"
            >
              {copiedSuccess === 'rich' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copiado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar para Outlook</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadCurrentEml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium transition"
              title="Descarregar ficheiro .EML padrão RFC 822"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Descarregar .EML</span>
            </button>

            {!selectedGtGroup && (
              <button
                type="button"
                onClick={() => downloadZipPackage(result)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs"
                title="Descarregar ZIP completo com HTML, EML e Excel"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>ZIP Completo</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium transition"
              title="Abrir no cliente de email predefinido"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Mailto</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center">
          {activeTab === 'preview' && (
            <div
              className={`bg-white shadow-md rounded-xl transition-all duration-300 overflow-hidden w-full ${
                deviceMode === 'desktop' ? 'max-w-[760px]' : 'max-w-[390px]'
              }`}
            >
              <iframe
                title="Email Preview"
                srcDoc={emailData.htmlBody}
                className="w-full h-full min-h-[620px] border-none"
              />
            </div>
          )}

          {activeTab === 'html' && (
            <div className="w-full max-w-4xl bg-slate-900 rounded-xl p-4 relative font-mono text-xs text-slate-200 overflow-auto">
              <button
                type="button"
                onClick={handleCopyHtml}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded text-xs flex items-center gap-1 border border-slate-700"
              >
                {copiedSuccess === 'html' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSuccess === 'html' ? 'Copiado!' : 'Copiar Código'}
              </button>
              <pre className="whitespace-pre-wrap">{emailData.htmlBody}</pre>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="w-full max-w-4xl bg-white rounded-xl p-6 font-mono text-xs text-slate-800 shadow-sm border border-slate-200 overflow-auto">
              <pre className="whitespace-pre-wrap">{emailData.plainTextBody}</pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Formato HTML inline 100% compatível com Outlook, Thunderbird e Gmail.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
