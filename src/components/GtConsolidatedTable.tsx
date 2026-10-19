import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Mail,
  Users,
  Send
} from 'lucide-react';
import { GtGroup, SellerSummary } from '../types';

interface GtConsolidatedTableProps {
  gtGroups: GtGroup[];
  selectedGtFilter: string;
  onSelectGtFilter: (gt: string) => void;
  onOpenReceiptDetails: (seller: SellerSummary) => void;
  onSendIndividualGt?: (group: GtGroup) => void;
}

export const GtConsolidatedTable: React.FC<GtConsolidatedTableProps> = ({
  gtGroups,
  selectedGtFilter,
  onSelectGtFilter,
  onOpenReceiptDetails,
  onSendIndividualGt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'top3' | 'intermediate' | 'zeroRecent'>('all');
  const [collapsedGts, setCollapsedGts] = useState<Record<string, boolean>>({});

  const toggleCollapse = (emailGt: string) => {
    setCollapsedGts((prev) => ({
      ...prev,
      [emailGt]: !prev[emailGt]
    }));
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    gtGroups.forEach((g) => (all[g.emailGt] = true));
    setCollapsedGts(all);
  };

  const expandAll = () => {
    setCollapsedGts({});
  };

  // Filtragem dos grupos e vendedores
  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return gtGroups
      .filter((group) => {
        if (selectedGtFilter && group.emailGt.toLowerCase() !== selectedGtFilter.toLowerCase()) {
          return false;
        }
        return true;
      })
      .map((group) => {
        const filteredVendedores = group.vendedores.filter((s) => {
          // Filtro de estado
          if (statusFilter === 'top3' && (s.ranking > 3 || s.acumuladoAno === 0)) return false;
          if (statusFilter === 'intermediate' && (s.ranking <= 3 || s.ultimos5DiasUteis === 0)) return false;
          if (statusFilter === 'zeroRecent' && s.ultimos5DiasUteis !== 0) return false;

          // Filtro de pesquisa por código, nome ou GT
          if (!term) return true;
          return (
            s.codigo.toLowerCase().includes(term) ||
            s.nomeVendedor.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term) ||
            s.emailGt.toLowerCase().includes(term)
          );
        });

        return {
          ...group,
          vendedores: filteredVendedores
        };
      })
      .filter((group) => group.vendedores.length > 0 || !searchTerm);
  }, [gtGroups, selectedGtFilter, searchTerm, statusFilter]);

  const uniqueGts = useMemo(() => {
    return Array.from(new Set(gtGroups.map((g) => g.emailGt))).sort();
  }, [gtGroups]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-8">
      
      {/* Título e Barra de Filtros */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Consolidação de Recibos Anulados por GT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ordenação decrescente por Acumulado Anual &bull; Ranking interno por GT &bull; Destaque visual por conformidade
            </p>
          </div>

          {/* Ações Rápidas: Recolher / Expandir */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg transition"
            >
              Expandir Todos
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg transition"
            >
              Recolher Todos
            </button>
          </div>
        </div>

        {/* Linha de Controlos: Pesquisa, Filtro GT, Filtro Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200/80">
          
          {/* Campo de Pesquisa */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por código, vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por GT */}
          <div>
            <select
              value={selectedGtFilter}
              onChange={(e) => onSelectGtFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="">Todos os Gestores de Território ({gtGroups.length})</option>
              {gtGroups.map((g) => (
                <option key={g.emailGt} value={g.emailGt}>
                  GT: {g.nomeGt || g.emailGt}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Destaque Visual */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="all">Todas as posições</option>
              <option value="top3">🔴 Apenas Vermelho (Top 3 Anual)</option>
              <option value="intermediate">🟡 Apenas Amarelo (Intermédios)</option>
              <option value="zeroRecent">🟢 Apenas Verde (0 Anulações 5 Dias)</option>
            </select>
          </div>

        </div>

        {/* Legenda de Cores Rápida */}
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Destaques Visuais:</span>
          
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-[11px]">
              <strong className="text-rose-700">Vermelho:</strong> Top 3 maior acumulado anual no GT
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px]">
              <strong className="text-amber-700">Amarelo:</strong> Posições intermédias
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px]">
              <strong className="text-emerald-700">Verde:</strong> Vendedores com 0 anulações nos últimos 5 dias úteis
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Secções por GT */}
      <div className="divide-y divide-slate-200">
        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Nenhum registo encontrado com os filtros selecionados.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isCollapsed = !!collapsedGts[group.emailGt];

            return (
              <div key={group.emailGt} className="p-4 sm:p-5">
                
                {/* Cabeçalho do GT */}
                <div
                  onClick={() => toggleCollapse(group.emailGt)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 text-white cursor-pointer hover:bg-slate-800 transition shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-400/30">
                      GT
                    </div>
                    <div>
                      <div className="text-xs text-blue-300 font-mono">Gestor de Território</div>
                      <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                        GT: {group.nomeGt || group.emailGt}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs self-end sm:self-auto">
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 border border-slate-700">
                      Vendedores: <strong className="text-white">{group.totalVendedores}</strong>
                    </span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md text-blue-300 border border-slate-700">
                      5 Dias: <strong className="text-white">{group.totalUltimos5Dias}</strong>
                    </span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md text-amber-300 border border-slate-700">
                      Acumulado Ano: <strong className="text-white">{group.totalAcumuladoAno}</strong>
                    </span>
                    {onSendIndividualGt && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendIndividualGt(group);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition shadow-xs ring-1 ring-indigo-400/30"
                        title={`Enviar email individual para ${group.nomeGt || group.emailGt} no Novo Outlook (Técnica RVV)`}
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Enviar GT</span>
                      </button>
                    )}
                    <div className="text-slate-400 pl-1">
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Tabela do GT */}
                {!isCollapsed && (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                          <th className="py-2.5 px-3 text-center w-16">Ranking</th>
                          <th className="py-2.5 px-3 w-24">Código</th>
                          <th className="py-2.5 px-3">Vendedor</th>
                          <th className="py-2.5 px-3 text-center w-36 bg-blue-50/50 text-blue-900">
                            Últimos 5 Dias Úteis
                          </th>
                          <th className="py-2.5 px-3 text-center w-32">Acumulado Ano</th>
                          <th className="py-2.5 px-3 text-center w-28">Auditoria</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.vendedores.map((s) => {
                          const isTop3 = s.ranking <= 3 && s.acumuladoAno > 0;
                          const isZeroRecent = s.ultimos5DiasUteis === 0;

                          // Destaque da linha e do ranking
                          let rankBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                          let rowClass = 'hover:bg-slate-50/80 transition';

                          if (isTop3) {
                            rankBadgeStyle = 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
                            rowClass = 'bg-rose-50/20 hover:bg-rose-50/40 transition';
                          } else if (s.acumuladoAno > 0) {
                            rankBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
                          }

                          return (
                            <tr key={s.codigo} className={rowClass}>
                              {/* Ranking */}
                              <td className="py-2.5 px-3 text-center font-bold">
                                <span
                                  className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-xs border ${rankBadgeStyle}`}
                                >
                                  {s.ranking}
                                </span>
                              </td>

                              {/* Código (Texto strictly) */}
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-950">
                                {s.codigo}
                              </td>

                              {/* Vendedor */}
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">
                                  {s.nomeVendedor}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {s.email || `${s.codigo}@sumolcompal.pt`}
                                </div>
                              </td>

                              {/* Últimos 5 Dias Úteis */}
                              <td className="py-2.5 px-3 text-center font-bold bg-blue-50/30">
                                {isZeroRecent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    0 anulações
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    {s.ultimos5DiasUteis}
                                  </span>
                                )}
                              </td>

                              {/* Acumulado Ano */}
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`font-black text-xs px-2 py-0.5 rounded ${
                                    isTop3
                                      ? 'text-rose-700 bg-rose-50 border border-rose-200'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {s.acumuladoAno}
                                </span>
                              </td>

                              {/* Ações / Detalhes */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => onOpenReceiptDetails(s)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md border border-slate-200 transition"
                                  title="Ver lista de recibos anulados deste vendedor"
                                >
                                  <FileSearch className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Recibos ({s.receipts.length})</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* Rodapé do Subtotal GT */}
                      <tfoot>
                        <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-800 text-[11px]">
                          <td colSpan={3} className="py-2.5 px-3 text-right">
                            Subtotal {group.nomeGt || group.emailGt}:
                          </td>
                          <td className="py-2.5 px-3 text-center text-blue-900 bg-blue-100/50">
                            {group.totalUltimos5Dias}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-900">
                            {group.totalAcumuladoAno}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
