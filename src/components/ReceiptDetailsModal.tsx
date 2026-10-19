import React from 'react';
import { X, FileText, Calendar, User, DollarSign, Tag, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SellerSummary, SapRawRow } from '../types';
import { isWithinBusinessDays, isWithinCurrentYear } from '../utils/businessDays';

interface ReceiptDetailsModalProps {
  seller: SellerSummary | null;
  onClose: () => void;
  referenceDate: Date;
  businessDaysRange: {
    start: Date;
    end: Date;
    daysList: Date[];
  };
}

export const ReceiptDetailsModal: React.FC<ReceiptDetailsModalProps> = ({
  seller,
  onClose,
  referenceDate,
  businessDaysRange
}) => {
  if (!seller) return null;

  const formatDatePt = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return '-';
    return val.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  {seller.codigo}
                </span>
                <h3 className="text-base font-bold text-white">
                  {seller.nomeVendedor}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                GT Responsável: <span className="text-slate-200">{seller.nomeGt || seller.emailGt}</span>
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

        {/* Stats Pill Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Recibos Únicos:</span>
              <span className="font-bold text-slate-900">{seller.receipts.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Últimos 5 Dias Úteis:</span>
              <span className={`font-bold ${seller.ultimos5DiasUteis === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {seller.ultimos5DiasUteis}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Acumulado Ano:</span>
              <span className="font-bold text-slate-900">{seller.acumuladoAno}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Deduplicação por Nº doc. aplicada
          </div>
        </div>

        {/* Table of Receipts */}
        <div className="flex-1 overflow-auto p-5">
          {seller.receipts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum recibo associado a este vendedor no ficheiro SAP.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Nº doc. (Recibo)</th>
                    <th className="py-2.5 px-3">Data Doc.</th>
                    <th className="py-2.5 px-3 text-center">Período 5 Dias</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3 text-right">Montante</th>
                    <th className="py-2.5 px-3">Motivo / Obs</th>
                    <th className="py-2.5 px-3 text-center">Linha SAP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seller.receipts.map((r, idx) => {
                    const in5Days = isWithinBusinessDays(r.data, {
                      startDate: businessDaysRange.start,
                      endDate: businessDaysRange.end,
                      days: businessDaysRange.daysList,
                      formattedRange: ''
                    });

                    return (
                      <tr key={`${r.numDoc}-${idx}`} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                          {r.numDoc}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {formatDatePt(r.data)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {in5Days ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                              Sim (Recente)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Não</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">
                          <span className="font-medium">{r.nomeCliente || '-'}</span>
                          {r.cliente && <span className="text-[11px] text-slate-400 block font-mono">{r.cliente}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {formatCurrency(r.montante)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {r.motivo || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                          #{r.linhaOriginal || idx + 2}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
