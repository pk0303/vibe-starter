import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  Clock,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  Check,
  Building2
} from 'lucide-react';
import type {
  ComplianceReportEntity,
  ComplianceReportType,
  ComplianceStatus,
  GrantEntity
} from '../types/grant';
import { dbService, subscribeToDatabase } from '../services/db';
import { formatCurrency, formatDate, getDaysRemaining, getDeadlineBadgeStyle } from '../utils/formatters';

interface ComplianceTrackerViewProps {
  onSelectGrant: (grantId: string) => void;
}

const REPORT_TYPES: ComplianceReportType[] = [
  'Interim Financial Report',
  'Narrative Progress Report',
  'SGX Sustainability & Impact',
  'Final Expenditure Audit',
  'Milestone Deliverable'
];

const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  'Upcoming',
  'Due Soon',
  'Submitted',
  'Overdue',
  'Approved'
];

export const ComplianceTrackerView: React.FC<ComplianceTrackerViewProps> = ({
  onSelectGrant,
}) => {
  const [reports, setReports] = useState<ComplianceReportEntity[]>([]);
  const [grants, setGrants] = useState<GrantEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal to add new report
  const [isAdding, setIsAdding] = useState(false);
  const [newReport, setNewReport] = useState({
    grant_id: '',
    report_type: 'Interim Financial Report' as ComplianceReportType,
    period_covered: '',
    due_date: '',
    amount_accounted: 0,
    reviewer: '',
    deliverables_summary: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [fetchedReports, fetchedGrants] = await Promise.all([
      dbService.getComplianceReports(),
      dbService.getGrants(),
    ]);
    setReports(fetchedReports);
    setGrants(fetchedGrants);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToDatabase(() => {
      loadData();
    });
    return unsub;
  }, []);

  const handleStatusChange = async (reportId: string, newStatus: ComplianceStatus) => {
    const filedDate = newStatus === 'Submitted' || newStatus === 'Approved'
      ? new Date().toISOString().split('T')[0]
      : null;

    await dbService.updateComplianceReport(reportId, {
      status: newStatus,
      filed_date: filedDate,
    });
    loadData();
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.grant_id || !newReport.due_date) return;

    await dbService.createComplianceReport({
      grant_id: newReport.grant_id,
      report_type: newReport.report_type,
      period_covered: newReport.period_covered || 'Scheduled Period',
      due_date: newReport.due_date,
      status: 'Upcoming',
      amount_accounted: Number(newReport.amount_accounted) || 0,
      filed_date: null,
      reviewer: newReport.reviewer || 'Internal Audit',
      deliverables_summary: newReport.deliverables_summary || null,
      document_url: null,
    });

    setIsAdding(false);
    setNewReport({
      grant_id: '',
      report_type: 'Interim Financial Report',
      period_covered: '',
      due_date: '',
      amount_accounted: 0,
      reviewer: '',
      deliverables_summary: '',
    });
    loadData();
  };

  const handleExportComplianceCsv = async () => {
    await dbService.exportComplianceToCsv();
  };

  // Filtered reports
  const filtered = reports.filter((r) => {
    if (filterType !== 'ALL' && r.report_type !== filterType) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    return true;
  });

  // Metrics summary
  const totalReportsCount = reports.length;
  const pendingCount = reports.filter((r) => r.status !== 'Approved' && r.status !== 'Submitted').length;
  const totalAccounted = reports.reduce((acc, r) => acc + (r.amount_accounted || 0), 0);
  const overdueCount = reports.filter((r) => {
    const days = getDaysRemaining(r.due_date);
    return days < 0 && r.status !== 'Approved' && r.status !== 'Submitted';
  }).length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Post-Award Compliance & Statutory Reporting Tracker
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            Track mandatory financial expenditure reports, narrative milestones, and SGX sustainability governance disclosures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportComplianceCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-300 rounded text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Schedule CSV</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium rounded text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Compliance Report</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-xs text-neutral-400 mb-1">Pending Compliance Filings</div>
          <div className="text-2xl font-semibold text-white tabular-nums font-mono">
            {pendingCount}
          </div>
          <div className="text-[11px] text-neutral-500">of {totalReportsCount} total requirements</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-xs text-neutral-400 mb-1">Total Expenditure Certified</div>
          <div className="text-2xl font-semibold text-emerald-400 tabular-nums font-mono">
            {formatCurrency(totalAccounted)}
          </div>
          <div className="text-[11px] text-neutral-500">Audited grant disbursement value</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-xs text-neutral-400 mb-1">Overdue Action Items</div>
          <div className={`text-2xl font-semibold tabular-nums font-mono ${overdueCount > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
            {overdueCount}
          </div>
          <div className="text-[11px] text-neutral-500">
            {overdueCount > 0 ? 'Immediate submission needed' : 'All filings in compliance'}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-xs text-neutral-400 mb-1">SGX / Impact Report Alignment</div>
          <div className="text-2xl font-semibold text-white tabular-nums">
            100%
          </div>
          <div className="text-[11px] text-neutral-500">Direct ESG governance coverage</div>
        </div>
      </div>

      {/* 3. Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 px-4 py-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Report Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-neutral-700"
            >
              <option value="ALL">All Types</option>
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-neutral-700"
            >
              <option value="ALL">All Statuses</option>
              {COMPLIANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-neutral-500 font-mono text-[11px]">
          Showing {filtered.length} compliance milestones
        </span>
      </div>

      {/* 4. Compliance Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-medium">
                <th className="py-3 px-4">Report Type & Milestone</th>
                <th className="py-3 px-3">Associated Grant</th>
                <th className="py-3 px-3">Due Date & Urgency</th>
                <th className="py-3 px-3 text-right">Expenditure Certified</th>
                <th className="py-3 px-3">Reviewer</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    No compliance records found for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => {
                  const daysRemaining = getDaysRemaining(report.due_date);
                  const badge = getDeadlineBadgeStyle(daysRemaining);

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-neutral-850/60 transition-colors group"
                    >
                      {/* Report Type */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {report.report_type}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {report.period_covered}
                        </div>
                        {report.deliverables_summary && (
                          <div className="text-[11px] text-neutral-500 truncate max-w-sm mt-0.5">
                            {report.deliverables_summary}
                          </div>
                        )}
                      </td>

                      {/* Associated Grant */}
                      <td className="py-3 px-3 max-w-xs">
                        <div
                          onClick={() => onSelectGrant(report.grant_id)}
                          className="text-neutral-300 hover:text-emerald-400 truncate cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <span className="truncate">{report.program_title || 'Linked Grant'}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {report.grantor_name}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-neutral-300">
                          {formatDate(report.due_date)}
                        </div>
                        <div className={`text-[11px] font-mono ${badge.className}`}>
                          {report.status === 'Submitted' || report.status === 'Approved'
                            ? `Filed on ${formatDate(report.filed_date || report.due_date)}`
                            : badge.text}
                        </div>
                      </td>

                      {/* Amount Accounted */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 font-medium">
                        {formatCurrency(report.amount_accounted)}
                      </td>

                      {/* Reviewer */}
                      <td className="py-3 px-3 text-neutral-300 truncate max-w-[140px]">
                        {report.reviewer || 'Internal Compliance'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <select
                          value={report.status}
                          onChange={(e) => handleStatusChange(report.id, e.target.value as ComplianceStatus)}
                          className="bg-neutral-950 border border-neutral-800 text-xs rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-neutral-700 cursor-pointer"
                        >
                          {COMPLIANCE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {report.status !== 'Approved' && report.status !== 'Submitted' ? (
                          <button
                            onClick={() => handleStatusChange(report.id, 'Submitted')}
                            className="px-2.5 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded transition-colors inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Filed</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-500 font-mono">
                            Archived
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Schedule Report Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-lg w-full p-6 shadow-2xl text-neutral-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-white mb-1">
              Schedule New Compliance Milestone
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Register a post-award reporting deadline, certified expenditure target, and assigned auditor.
            </p>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Target Grant *
                </label>
                <select
                  required
                  value={newReport.grant_id}
                  onChange={(e) => setNewReport({ ...newReport, grant_id: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="">Select a grant...</option>
                  {grants.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.program_title} ({g.grantor_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Report Type
                  </label>
                  <select
                    value={newReport.report_type}
                    onChange={(e) => setNewReport({ ...newReport, report_type: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {REPORT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newReport.due_date}
                    onChange={(e) => setNewReport({ ...newReport, due_date: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Period Covered
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Q2 2026 / Milestone 1"
                    value={newReport.period_covered}
                    onChange={(e) => setNewReport({ ...newReport, period_covered: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Expenditure Certified ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newReport.amount_accounted}
                    onChange={(e) => setNewReport({ ...newReport, amount_accounted: Number(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Assigned Auditor / Reviewer
                </label>
                <input
                  type="text"
                  placeholder="e.g. PwC Advisory, Board Committee"
                  value={newReport.reviewer}
                  onChange={(e) => setNewReport({ ...newReport, reviewer: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Deliverables Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Key milestones, receipts, or ESG metrics verified in this cycle"
                  value={newReport.deliverables_summary}
                  onChange={(e) => setNewReport({ ...newReport, deliverables_summary: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded"
                >
                  Save to SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
