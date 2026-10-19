import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Download,
  Upload,
  Search,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { SellerTemplate } from '../types';
import { DEFAULT_SELLERS_TEMPLATE } from '../data/defaultTemplate';
import { generateTemplateEmailsWorkbook, normalizeSellerCode } from '../utils/excelParser';
import { triggerDownload } from '../utils/exporter';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: SellerTemplate[];
  onSaveTemplates: (updated: SellerTemplate[]) => void;
  onUploadFile: (file: File) => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplates,
  onUploadFile
}) => {
  const [list, setList] = useState<SellerTemplate[]>(templates);
  const [search, setSearch] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGtName, setNewGtName] = useState('');
  const [newGtEmail, setNewGtEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSeller = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = normalizeSellerCode(newCode);

    if (!code) {
      setErrorMsg('O código de vendedor é obrigatório.');
      return;
    }
    if (!newName.trim()) {
      setErrorMsg('O nome do vendedor é obrigatório.');
      return;
    }
    if (!newGtEmail.trim() || !newGtEmail.includes('@')) {
      setErrorMsg('Introduz um email de GT válido.');
      return;
    }

    if (list.some((s) => s.codigo.toLowerCase() === code.toLowerCase())) {
      setErrorMsg(`O código "${code}" já existe no template.`);
      return;
    }

    const newSeller: SellerTemplate = {
      codigo: code,
      nomeVendedor: newName.trim(),
      email: newEmail.trim() || `${code.toLowerCase()}@sumolcompal.pt`,
      nomeGt: newGtName.trim() || undefined,
      emailGt: newGtEmail.trim().toLowerCase()
    };

    const updated = [...list, newSeller];
    setList(updated);
    onSaveTemplates(updated);
    setNewCode('');
    setNewName('');
    setNewEmail('');
    setNewGtName('');
    setNewGtEmail('');
    setSuccessMsg('Vendedor adicionado com sucesso!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = (code: string) => {
    const updated = list.filter((s) => s.codigo !== code);
    setList(updated);
    onSaveTemplates(updated);
  };

  const handleResetDefaults = () => {
    if (confirm('Desejas repor o Template predefinido da Sumol+Compal?')) {
      setList(DEFAULT_SELLERS_TEMPLATE);
      onSaveTemplates(DEFAULT_SELLERS_TEMPLATE);
      setSuccessMsg('Template predefinido restaurado.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleDownload = () => {
    const buffer = generateTemplateEmailsWorkbook(list);
    const blob = new Blob([buffer.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    triggerDownload(blob, 'Template_Emails.xlsx');
  };

  const filtered = list.filter(
    (s) =>
      s.codigo.toLowerCase().includes(search.toLowerCase()) ||
      s.nomeVendedor.toLowerCase().includes(search.toLowerCase()) ||
      s.emailGt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Gestão do Template de Vendedores & GT (Template_Emails.xlsx)
              </h3>
              <p className="text-xs text-slate-400">
                Mapeamento de Códigos (texto), Nomes e respetivo Email GT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar vendedor ou GT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition"
              title="Descarregar ficheiro Excel Template_Emails.xlsx"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Descarregar .xlsx</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition"
              title="Restaurar base predefinida da Sumol+Compal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Repor Padrão</span>
            </button>
          </div>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}

        {/* Add New Seller Form */}
        <form onSubmit={handleAddSeller} className="p-4 bg-blue-50/50 border-b border-blue-100 text-xs">
          <div className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Adicionar Novo Vendedor ao Template (com Nome GT):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
            <input
              type="text"
              placeholder="Código (ex: 049, G04)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono"
            />
            <input
              type="text"
              placeholder="Nome do Vendedor"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md sm:col-span-1"
            />
            <input
              type="email"
              placeholder="Email Vendedor (opcional)"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
            />
            <input
              type="text"
              placeholder="Nome GT (ex: Jorge Rodrigues)"
              value={newGtName}
              onChange={(e) => setNewGtName(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
            />
            <input
              type="email"
              placeholder="Email GT (obrigatório)"
              value={newGtEmail}
              onChange={(e) => setNewGtEmail(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition shadow-xs"
            >
              Adicionar
            </button>
          </div>
        </form>

        {/* Table of Sellers in Template */}
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-28">Codigo_3_digitos</th>
                  <th className="py-2.5 px-3">Nome Vendedor</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3 text-blue-900 font-bold bg-blue-50/50">Nome GT</th>
                  <th className="py-2.5 px-3">Email GT (Agrupamento)</th>
                  <th className="py-2.5 px-3 text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.codigo} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-900">
                      {s.codigo}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {s.nomeVendedor}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                      {s.email}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 bg-blue-50/20">
                      {s.nomeGt || <span className="text-slate-400 italic">Fallback (Email GT)</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-800 font-mono text-[11px]">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                        {s.emailGt}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(s.codigo)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                        title="Remover vendedor do template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{list.length} vendedores registados no template</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition"
          >
            Concluir & Aplicar
          </button>
        </div>

      </div>
    </div>
  );
};
