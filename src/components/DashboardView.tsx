import React from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  FileCheck
} from 'lucide-react';
import type { DashboardMetrics, GrantStage } from '../types/grant';
import { formatCurrency, formatDate, getDaysRemaining, getDeadlineBadgeStyle } from '../utils/formatters';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  onNavigateToPipeline: (stage?: GrantStage) => void;
  onNavigateToCompliance: () => void;
  onSelectGrant: (grantId: string) => void;
  onOpenNewGrantModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  onNavigateToPipeline,
  onNavigateToCompliance,
  onSelectGrant,
  onOpenNewGrantModal,
}) => {
  if (!metrics) {
    return (
      <div className="p-8 text-center text-neutral-500">
        <div className="animate-pulse">Loading SQLite metrics from local database...</div>
      </div>
    );
  }

  // Pipeline stage items
  const stageSummary: Array<{
    stage: GrantStage;
    count: number;
    color: string;
    description: string;
  }> = [
    {
      stage: 'Prospecting',
      count: metrics.stageCounts.Prospecting || 0,
      color: 'bg-neutral-600',
      description: 'Discovery & eligibility',
    },
    {
      stage: 'Drafting',
      count: metrics.stageCounts.Drafting || 0,
      color: 'bg-sky-500',
      description: 'Writing & budgeting',
    },
    {
      stage: 'Submitted',
      count: metrics.stageCounts.Submitted || 0,
      color: 'bg-indigo-500',
      description: 'Awaiting grantor review',
    },
    {
      stage: 'Under Review',
      count: metrics.stageCounts['Under Review'] || 0,
      color: 'bg-amber-500',
      description: 'Evaluation panel round',
    },
    {
      stage: 'Awarded',
      count: metrics.stageCounts.Awarded || 0,
      color: 'bg-emerald-500',
      description: 'Active funded grants',
    },
    {
      stage: 'Rejected',
      count: metrics.stageCounts.Rejected || 0,
      color: 'bg-rose-500',
      description: 'Unsuccessful bids',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Core Summary Metric Cards (4 Required Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Active Grants */}
        <div
          onClick={() => onNavigateToPipeline()}
          className="group cursor-pointer bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium tracking-wide">Total Active Grants</span>
            <Layers className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
          </div>
          <div className="text-3xl font-semibold text-white tracking-tight tabular-nums mb-1">
            {metrics.totalActiveGrants}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>In pipeline & post-award</span>
            <span className="text-neutral-600">·</span>
            <span className="text-emerald-400 group-hover:underline flex items-center">
              View pipeline <ArrowRight className="w-3 h-3 ml-0.5 inline" />
            </span>
          </div>
        </div>

        {/* Card 2: Pending Applications */}
        <div
          onClick={() => onNavigateToPipeline('Under Review')}
          className="group cursor-pointer bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium tracking-wide">Pending Applications</span>
            <Clock className="w-4 h-4 text-sky-400 group-hover:text-sky-300 transition-colors" />
          </div>
          <div className="text-3xl font-semibold text-white tracking-tight tabular-nums mb-1">
            {metrics.pendingApplicationsCount}
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Requested volume:</span>
            <span className="font-mono text-neutral-200 tabular-nums font-medium">
              {formatCurrency(metrics.pendingApplicationsAmount)}
            </span>
          </div>
        </div>

        {/* Card 3: Total Awarded Funding */}
        <div
          onClick={() => onNavigateToPipeline('Awarded')}
          className="group cursor-pointer bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium tracking-wide">Total Awarded Funding</span>
            <Award className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
          </div>
          <div className="text-3xl font-semibold text-emerald-400 tracking-tight tabular-nums mb-1 font-mono">
            {formatCurrency(metrics.totalAwardedFunding)}
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Active capital disbursed</span>
            <span className="text-emerald-400/90 font-medium font-mono tabular-nums">
              {metrics.stageCounts.Awarded} grants secured
            </span>
          </div>
        </div>

        {/* Card 4: Upcoming Deadlines within 30 days */}
        <div
          onClick={() => (metrics.upcomingDeadlines30Days > 0 ? onNavigateToCompliance() : undefined)}
          className="group cursor-pointer bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium tracking-wide">Upcoming Deadlines (30d)</span>
            <Calendar className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition-colors" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl font-semibold text-white tracking-tight tabular-nums">
              {metrics.upcomingDeadlines30Days}
            </span>
            {metrics.upcomingDeadlines30Days > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Action Required
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-400 truncate">
            Submissions & post-award reports
          </div>
        </div>
      </div>

      {/* 2. Visual Pipeline Stage Distribution */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Pipeline Lifecycle Distribution</h3>
            <p className="text-xs text-neutral-400">
              Live snapshot of application volumes across all operational stages
            </p>
          </div>
          <button
            onClick={() => onNavigateToPipeline()}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Open Pipeline Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Segmented bar */}
        <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden flex mb-4 border border-neutral-800/80">
          {stageSummary.map((item) => {
            const total = metrics.totalActiveGrants + (metrics.stageCounts.Rejected || 0);
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            if (percentage === 0) return null;
            return (
              <div
                key={item.stage}
                style={{ width: `${percentage}%` }}
                className={`${item.color} h-full transition-all hover:opacity-80`}
                title={`${item.stage}: ${item.count} grants (${Math.round(percentage)}%)`}
              />
            );
          })}
        </div>

        {/* Grid summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stageSummary.map((item) => (
            <button
              key={item.stage}
              onClick={() => onNavigateToPipeline(item.stage)}
              className="text-left p-3 rounded-md bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-xs font-medium text-neutral-300 truncate">
                  {item.stage}
                </span>
              </div>
              <div className="text-xl font-semibold text-white tabular-nums font-mono">
                {item.count}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">
                {item.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Dashboard Columns: Upcoming Deadlines (30 Days) + Grantor Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Deadlines within Next 30 Days */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-semibold text-white">
                  Upcoming Deadlines (Next 30 Days)
                </h3>
              </div>
              <span className="text-xs text-neutral-400 font-mono tabular-nums">
                {metrics.deadlinesList.length} scheduled items
              </span>
            </div>

            {metrics.deadlinesList.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                <CheckCircle2 className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs">No pending grant submissions or compliance filings within the next 30 days.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/80">
                {metrics.deadlinesList.map((item) => {
                  const badge = getDeadlineBadgeStyle(item.daysRemaining);
                  const isCompliance = item.type === 'compliance';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isCompliance) {
                          onNavigateToCompliance();
                        } else {
                          onSelectGrant(item.grantId);
                        }
                      }}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-neutral-850 px-2 rounded-md cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              isCompliance
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                            }`}
                          >
                            {isCompliance ? 'Compliance Filing' : 'Grant Submission'}
                          </span>
                          <span className="text-xs text-neutral-400 truncate">
                            {item.grantor}
                          </span>
                        </div>
                        <h4 className="text-xs font-medium text-neutral-200 truncate">
                          {item.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs tabular-nums ${badge.className}`}>
                          {badge.text}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {formatDate(item.dueDate)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Post-award milestones and initial submissions synced with local SQLite.</span>
            <button
              onClick={onNavigateToCompliance}
              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center gap-1"
            >
              <span>Compliance schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Funding by Category & SGX / Board Compliance Widget */}
        <div className="space-y-6">
          {/* Category Distribution */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neutral-400" />
              <span>Portfolio by Grantor Category</span>
            </h3>

            <div className="space-y-3">
              {metrics.fundingByCategory.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300">{cat.category}</span>
                    <span className="font-mono text-neutral-200 tabular-nums">
                      {cat.awardedAmount > 0
                        ? formatCurrency(cat.awardedAmount)
                        : `${formatCurrency(cat.requestedAmount)} (req)`}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="bg-emerald-400 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          metrics.totalAwardedFunding > 0
                            ? (cat.awardedAmount / metrics.totalAwardedFunding) * 100
                            : 40
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Board & SGX Readiness Widget (from canvas ideas) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                SGX & Board Reporting Engine
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              Local verifiable record of deliverables and grant spending to eliminate manual audit friction and human reporting errors.
            </p>
            <div className="p-3 bg-neutral-950/80 rounded border border-neutral-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Audited Expenditure</span>
                <span className="text-emerald-400 font-mono font-medium">$830,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Disbursement Status</span>
                <span className="text-neutral-300 font-medium">On Track (100%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Lead Officer</span>
                <span className="text-neutral-300 font-medium">Suzanna Barrett</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
