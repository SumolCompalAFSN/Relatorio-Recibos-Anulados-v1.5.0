import React from 'react';
import {
  FileText,
  Users,
  Briefcase,
  CheckCircle,
  TrendingDown,
  Layers,
  CalendarCheck
} from 'lucide-react';
import { ProcessingKpis } from '../types';

interface KpiCardsProps {
  kpis: ProcessingKpis;
  totalUltimos5Dias: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, totalUltimos5Dias }) => {
  const complianceRate = kpis.totalVendedoresComAnulacoes > 0
    ? Math.round((kpis.totalVendedoresZeroRecente / kpis.totalVendedoresComAnulacoes) * 100)
    : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      
      {/* 1. Total Recibos Anulados */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden group hover:border-blue-400 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Recibos Anulados
          </span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          {kpis.totalRecibosAnulados}
        </div>
        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
          <span className="font-semibold text-emerald-600">Únicos por Nº doc.</span>
          
        </p>
      </div>

      {/* 2. Total Vendedores com Anulações */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-400 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Vendedores c/ Anulações
          </span>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          {kpis.totalVendedoresComAnulacoes}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Com pelo menos 1 recibo no ano
        </p>
      </div>

      {/* 3. Total GT Envolvidos */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden group hover:border-amber-400 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            GTs Envolvidos
          </span>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          {kpis.totalGtEnvolvidos}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Grupos de Território ativos
        </p>
      </div>

      {/* 4. Últimos 5 Dias Úteis */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden group hover:border-rose-400 transition">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Últimos 5 Dias Úteis
          </span>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-105 transition-transform">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-rose-600 tracking-tight">
          {totalUltimos5Dias}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Recibos no período recente
        </p>
      </div>

      {/* 5. Vendedores Sem Anulações Recentes (Verde) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition col-span-2 md:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            0 Anulações (5 Dias)
          </span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-600 tracking-tight">
            {kpis.totalVendedoresZeroRecente}
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
            {complianceRate}%
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Vendedores em conformidade verde
        </p>
      </div>

    </div>
  );
};
