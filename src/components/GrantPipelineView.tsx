import React, { useState } from 'react';
import {
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  DollarSign,
  ArrowUpDown
} from 'lucide-react';
import type { GrantEntity, GrantStage } from '../types/grant';
import { formatCurrency, formatDate, getDaysRemaining, getDeadlineBadgeStyle, getStageColor } from '../utils/formatters';

interface GrantPipelineViewProps {
  grants: GrantEntity[];
  onSelectGrant: (grantId: string) => void;
  onUpdateStage: (grantId: string, newStage: GrantStage) => void;
  onOpenNewGrantModalWithStage: (stage: GrantStage) => void;
}

const ALL_STAGES: GrantStage[] = [
  'Prospecting',
  'Drafting',
  'Submitted',
  'Under Review',
  'Awarded',
  'Rejected',
];

export const GrantPipelineView: React.FC<GrantPipelineViewProps> = ({
  grants,
  onSelectGrant,
  onUpdateStage,
  onOpenNewGrantModalWithStage,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [tableSortField, setTableSortField] = useState<keyof GrantEntity>('submission_deadline');
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(true);

  // Group grants by stage for Kanban
  const grantsByStage: Record<GrantStage, GrantEntity[]> = {
    Prospecting: [],
    Drafting: [],
    Submitted: [],
    'Under Review': [],
    Awarded: [],
    Rejected: [],
  };

  grants.forEach((g) => {
    if (grantsByStage[g.stage]) {
      grantsByStage[g.stage].push(g);
    }
  });

  // Calculate stage totals for column headers
  const getStageTotalAmount = (stageGrants: GrantEntity[]) => {
    return stageGrants.reduce((acc, g) => {
      return acc + (g.stage === 'Awarded' ? g.awarded_amount : g.requested_amount);
    }, 0);
  };

  // Move stage navigation helpers
  const getPrevStage = (current: GrantStage): GrantStage | null => {
    const idx = ALL_STAGES.indexOf(current);
    return idx > 0 ? ALL_STAGES[idx - 1] : null;
  };

  const getNextStage = (current: GrantStage): GrantStage | null => {
    const idx = ALL_STAGES.indexOf(current);
    return idx < ALL_STAGES.length - 1 ? ALL_STAGES[idx + 1] : null;
  };

  // Sorted list for table view
  const sortedGrants = [...grants].sort((a, b) => {
    const valA = (a as any)[tableSortField] ?? '';
    const valB = (b as any)[tableSortField] ?? '';
    if (valA < valB) return tableSortAsc ? -1 : 1;
    if (valA > valB) return tableSortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: keyof GrantEntity) => {
    if (tableSortField === field) {
      setTableSortAsc(!tableSortAsc);
    } else {
      setTableSortField(field);
      setTableSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header controls: Title & Kanban/Table toggle switch */}
      <div className="flex items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5">
        <div>
          <span className="text-xs text-neutral-400 font-mono">
            {grants.length} grants tracked
          </span>
          <span className="text-neutral-600 mx-2">·</span>
          <span className="text-xs text-neutral-400">
            Total Pipeline Volume: <span className="font-mono text-white font-medium">{formatCurrency(grants.reduce((acc, g) => acc + (g.stage === 'Awarded' ? g.awarded_amount : g.requested_amount), 0))}</span>
          </span>
        </div>

        {/* View mode toggle switch */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-md border border-neutral-800">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'kanban'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {/* 2. Mode A: Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
          {ALL_STAGES.map((stage) => {
            const stageGrants = grantsByStage[stage];
            const totalStageAmount = getStageTotalAmount(stageGrants);
            const style = getStageColor(stage);

            return (
              <div
                key={stage}
                className="bg-neutral-900/90 border border-neutral-800 rounded-lg flex flex-col min-h-[560px] max-h-[calc(100vh-230px)] overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-neutral-800/80 bg-neutral-950/60 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <h4 className="text-xs font-semibold text-white tracking-tight truncate">
                        {stage}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400 bg-neutral-850 px-1.5 py-0.5 rounded border border-neutral-800">
                      {stageGrants.length}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400 tabular-nums">
                    {formatCurrency(totalStageAmount)}
                  </div>
                </div>

                {/* Grants Cards List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {stageGrants.length === 0 ? (
                    <div className="py-10 text-center text-neutral-600 text-xs">
                      No grants in this stage
                    </div>
                  ) : (
                    stageGrants.map((grant) => {
                      const daysRemaining = getDaysRemaining(grant.submission_deadline);
                      const badge = getDeadlineBadgeStyle(daysRemaining);
                      const prevStage = getPrevStage(grant.stage);
                      const nextStage = getNextStage(grant.stage);

                      return (
                        <div
                          key={grant.id}
                          className="group bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-md p-3 transition-all shadow-xs flex flex-col justify-between"
                        >
                          <div
                            onClick={() => onSelectGrant(grant.id)}
                            className="cursor-pointer space-y-2"
                          >
                            {/* Grantor name */}
                            <div className="text-[11px] font-medium text-neutral-400 truncate flex items-center justify-between">
                              <span>{grant.grantor_name}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500" />
                            </div>

                            {/* Program title */}
                            <h5 className="text-xs font-semibold text-neutral-100 line-clamp-2 leading-snug">
                              {grant.program_title}
                            </h5>

                            {/* Amount */}
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-850">
                              <span className="text-[11px] text-neutral-500">
                                {grant.stage === 'Awarded' ? 'Awarded:' : 'Requested:'}
                              </span>
                              <span className="font-mono text-neutral-200 font-semibold tabular-nums">
                                {formatCurrency(
                                  grant.stage === 'Awarded'
                                    ? grant.awarded_amount
                                    : grant.requested_amount
                                )}
                              </span>
                            </div>

                            {/* Deadline and Lead */}
                            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-0.5">
                              <span className="flex items-center gap-1 truncate max-w-[110px]" title={grant.assigned_lead}>
                                <User className="w-3 h-3 shrink-0 text-neutral-500" />
                                <span className="truncate">{grant.assigned_lead}</span>
                              </span>
                              <span className={`font-mono ${badge.className}`}>
                                {badge.text}
                              </span>
                            </div>

                            {/* Document checklist indicator */}
                            {grant.checklist_total !== undefined && grant.checklist_total > 0 && (
                              <div className="pt-1.5 border-t border-neutral-850/60">
                                <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400/80" />
                                    <span>Checklist</span>
                                  </span>
                                  <span className="font-mono">
                                    {grant.checklist_completed}/{grant.checklist_total}
                                  </span>
                                </div>
                                <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{
                                      width: `${(grant.checklist_completed! / grant.checklist_total!) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Stage Progression Controls */}
                          <div className="mt-2.5 pt-2 border-t border-neutral-850 flex items-center justify-between gap-1 text-[11px] text-neutral-500">
                            {prevStage ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateStage(grant.id, prevStage);
                                }}
                                className="px-1.5 py-0.5 hover:bg-neutral-800 hover:text-neutral-200 rounded text-[10px] transition-colors flex items-center gap-0.5"
                                title={`Move back to ${prevStage}`}
                              >
                                <ChevronLeft className="w-3 h-3" />
                                <span>{prevStage}</span>
                              </button>
                            ) : (
                              <span />
                            )}

                            {nextStage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateStage(grant.id, nextStage);
                                }}
                                className="px-1.5 py-0.5 hover:bg-neutral-800 hover:text-neutral-200 rounded text-[10px] transition-colors flex items-center gap-0.5 ml-auto"
                                title={`Advance to ${nextStage}`}
                              >
                                <span>{nextStage}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Add Button at bottom of column */}
                <div className="p-2 border-t border-neutral-800/80 bg-neutral-950/40 shrink-0">
                  <button
                    onClick={() => onOpenNewGrantModalWithStage(stage)}
                    className="w-full py-1.5 px-2 text-[11px] text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 rounded flex items-center justify-center gap-1 transition-colors border border-dashed border-neutral-800"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add to {stage}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. Mode B: Desktop Table View */
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-medium select-none">
                  <th
                    onClick={() => toggleSort('program_title')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Program & Grantor</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('stage')}
                    className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Stage</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('requested_amount')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Requested</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('awarded_amount')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Awarded</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('submission_deadline')}
                    className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Deadline</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Checklist</th>
                  <th className="py-3 px-3">Lead</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {sortedGrants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500">
                      No grants match the selected filters.
                    </td>
                  </tr>
                ) : (
                  sortedGrants.map((grant) => {
                    const daysRemaining = getDaysRemaining(grant.submission_deadline);
                    const badge = getDeadlineBadgeStyle(daysRemaining);

                    return (
                      <tr
                        key={grant.id}
                        className="hover:bg-neutral-850/60 transition-colors group cursor-pointer"
                        onClick={() => onSelectGrant(grant.id)}
                      >
                        {/* Title & Grantor */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-white truncate">
                            {grant.program_title}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            {grant.grantor_name} · <span className="text-neutral-500">{grant.category}</span>
                          </div>
                        </td>

                        {/* Stage Dropdown */}
                        <td className="py-3 px-3">
                          <select
                            value={grant.stage}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onUpdateStage(grant.id, e.target.value as GrantStage)}
                            className="bg-neutral-950 border border-neutral-800 text-xs rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-neutral-700 cursor-pointer"
                          >
                            {ALL_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Requested Amount */}
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300 font-medium">
                          {formatCurrency(grant.requested_amount)}
                        </td>

                        {/* Awarded Amount */}
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                          {grant.stage === 'Awarded' ? formatCurrency(grant.awarded_amount) : '—'}
                        </td>

                        {/* Deadline */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono text-neutral-300">
                            {formatDate(grant.submission_deadline)}
                          </div>
                          <div className={`text-[11px] font-mono ${badge.className}`}>
                            {badge.text}
                          </div>
                        </td>

                        {/* Checklist progress */}
                        <td className="py-3 px-3">
                          <div className="text-[11px] text-neutral-400 font-mono mb-1">
                            {grant.checklist_completed ?? 0}/{grant.checklist_total ?? 0} ready
                          </div>
                          <div className="w-20 bg-neutral-950 h-1 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{
                                width: `${
                                  grant.checklist_total
                                    ? (grant.checklist_completed! / grant.checklist_total) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </td>

                        {/* Assigned Lead */}
                        <td className="py-3 px-3 text-neutral-300 truncate max-w-[130px]">
                          {grant.assigned_lead}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectGrant(grant.id);
                            }}
                            className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors"
                          >
                            Open Drawer
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
