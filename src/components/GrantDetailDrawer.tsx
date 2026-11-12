import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Plus,
  FileText,
  AlertCircle,
  Paperclip,
  Check,
  Building,
  DollarSign
} from 'lucide-react';
import type {
  GrantDetailPayload,
  GrantStage,
  DocumentCategory,
  ChecklistStatus,
  DocumentChecklistEntity
} from '../types/grant';
import { dbService } from '../services/db';
import { formatCurrency, formatDate, getDaysRemaining, getDeadlineBadgeStyle } from '../utils/formatters';

interface GrantDetailDrawerProps {
  grantId: string | null;
  onClose: () => void;
  onGrantUpdated: () => void;
  onGrantDeleted: () => void;
  onOpenComplianceView: () => void;
}

const CATEGORIES = [
  'Government Agency',
  'Private Foundation',
  'Corporate ESG',
  'Research & Education',
  'Philanthropic Trust'
];

const STAGES: GrantStage[] = [
  'Prospecting',
  'Drafting',
  'Submitted',
  'Under Review',
  'Awarded',
  'Rejected'
];

const DOC_CATEGORIES: DocumentCategory[] = [
  'Proposal',
  'Budget',
  'Legal & Tax',
  'Governance',
  'Technical'
];

export const GrantDetailDrawer: React.FC<GrantDetailDrawerProps> = ({
  grantId,
  onClose,
  onGrantUpdated,
  onGrantDeleted,
  onOpenComplianceView,
}) => {
  const [data, setData] = useState<GrantDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'compliance' | 'activity'>('details');

  // New checklist item inline form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('Proposal');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Form edit states
  const [formData, setFormData] = useState<{
    grantor_name: string;
    program_title: string;
    category: string;
    stage: GrantStage;
    requested_amount: number;
    awarded_amount: number;
    submission_deadline: string;
    decision_date: string;
    assigned_lead: string;
    lead_email: string;
    website_url: string;
    notes: string;
  }>({
    grantor_name: '',
    program_title: '',
    category: '',
    stage: 'Prospecting',
    requested_amount: 0,
    awarded_amount: 0,
    submission_deadline: '',
    decision_date: '',
    assigned_lead: '',
    lead_email: '',
    website_url: '',
    notes: '',
  });

  useEffect(() => {
    if (!grantId) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    dbService.getGrantById(grantId).then((res) => {
      if (isMounted && res) {
        setData(res);
        setFormData({
          grantor_name: res.grantor_name,
          program_title: res.program_title,
          category: res.category,
          stage: res.stage,
          requested_amount: res.requested_amount,
          awarded_amount: res.awarded_amount,
          submission_deadline: res.submission_deadline,
          decision_date: res.decision_date || '',
          assigned_lead: res.assigned_lead,
          lead_email: res.lead_email || '',
          website_url: res.website_url || '',
          notes: res.notes || '',
        });
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [grantId]);

  if (!grantId) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!grantId) return;

    setSaving(true);
    try {
      await dbService.updateGrant(grantId, {
        ...formData,
        requested_amount: Number(formData.requested_amount) || 0,
        awarded_amount: Number(formData.awarded_amount) || 0,
      });
      // Refresh current grant view
      const updated = await dbService.getGrantById(grantId);
      setData(updated);
      onGrantUpdated();
    } catch (err) {
      console.error('Failed to save grant details', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!grantId) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${formData.program_title}"? This will remove all associated checklist items and compliance schedules from the local SQLite database.`
    );
    if (!confirmDelete) return;

    await dbService.deleteGrant(grantId);
    onGrantDeleted();
    onClose();
  };

  const handleToggleDocStatus = async (item: DocumentChecklistEntity) => {
    const nextStatus: Record<ChecklistStatus, ChecklistStatus> = {
      'Not Started': 'In Progress',
      'In Progress': 'Ready',
      'Ready': 'Submitted',
      'Submitted': 'In Progress',
    };
    const updatedStatus = nextStatus[item.status];
    await dbService.toggleChecklistItem(item.id, updatedStatus);
    const updated = await dbService.getGrantById(grantId);
    setData(updated);
    onGrantUpdated();
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !grantId) return;

    await dbService.addChecklistItem(grantId, newDocTitle.trim(), newDocCategory);
    setNewDocTitle('');
    setIsAddingDoc(false);
    const updated = await dbService.getGrantById(grantId);
    setData(updated);
    onGrantUpdated();
  };

  const handleDeleteChecklistItem = async (docId: string) => {
    await dbService.deleteChecklistItem(docId);
    const updated = await dbService.getGrantById(grantId);
    setData(updated);
    onGrantUpdated();
  };

  const daysRemaining = getDaysRemaining(formData.submission_deadline);
  const deadlineBadge = getDeadlineBadgeStyle(daysRemaining);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col h-full text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-neutral-400">
                {formData.grantor_name || 'Grant Detail'}
              </span>
              <span className="text-neutral-600">·</span>
              <span className={`text-xs font-mono ${deadlineBadge.className}`}>
                {deadlineBadge.text}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white truncate">
              {formData.program_title || 'Untitled Grant Program'}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-neutral-800 bg-neutral-950/40 text-xs">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Grant Details
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Document Checklist</span>
            {data?.checklist && (
              <span className="font-mono text-[11px] bg-neutral-800 px-1.5 py-0.2 rounded text-neutral-300">
                {data.checklist.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'compliance'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Reporting Schedule</span>
            {data?.compliance_reports && (
              <span className="font-mono text-[11px] bg-neutral-800 px-1.5 py-0.2 rounded text-neutral-300">
                {data.compliance_reports.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-neutral-500">
              Loading grant from local SQLite...
            </div>
          ) : activeTab === 'details' ? (
            /* TAB 1: Grant Details Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Program Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Program Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.program_title}
                    onChange={(e) => setFormData({ ...formData, program_title: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Grantor Name */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Grantor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.grantor_name}
                    onChange={(e) => setFormData({ ...formData, grantor_name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Lifecycle Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as GrantStage })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 cursor-pointer"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Lead */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Assigned Lead *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.assigned_lead}
                    onChange={(e) => setFormData({ ...formData, assigned_lead: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Requested Amount */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Requested Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.requested_amount}
                    onChange={(e) => setFormData({ ...formData, requested_amount: Number(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Awarded Amount */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Awarded Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.awarded_amount}
                    onChange={(e) => setFormData({ ...formData, awarded_amount: Number(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Submission Deadline */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Submission Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.submission_deadline}
                    onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-700 cursor-pointer"
                  />
                </div>

                {/* Decision Date */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Target Decision / Award Date
                  </label>
                  <input
                    type="date"
                    value={formData.decision_date}
                    onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-700 cursor-pointer"
                  />
                </div>

                {/* Lead Email */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Lead Email
                  </label>
                  <input
                    type="email"
                    value={formData.lead_email}
                    onChange={(e) => setFormData({ ...formData, lead_email: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Grantor Portal / Scheme URL
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Notes & Scope */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Executive Scope & Notes
                  </label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter project scope, key partners, and strategic alignment..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>
              </div>

              {/* Danger Zone: Delete */}
              <div className="pt-6 border-t border-neutral-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Grant from SQLite</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : activeTab === 'checklist' ? (
            /* TAB 2: Document Checklist */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Application Document Checklist</h4>
                  <p className="text-[11px] text-neutral-400">
                    Track statutory filings, audited balance sheets, and narrative proposals required by grantor.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingDoc(!isAddingDoc)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Document</span>
                </button>
              </div>

              {/* Inline Add Document Form */}
              {isAddingDoc && (
                <form
                  onSubmit={handleAddChecklistItem}
                  className="p-3 bg-neutral-950 border border-neutral-800 rounded-md space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Document title (e.g. 3-Year Audited Accounts)"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <select
                        value={newDocCategory}
                        onChange={(e) => setNewDocCategory(e.target.value as DocumentCategory)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {DOC_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(false)}
                      className="px-2.5 py-1 text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-500 text-neutral-950 font-medium rounded hover:bg-emerald-400"
                    >
                      Add to SQLite
                    </button>
                  </div>
                </form>
              )}

              {/* Checklist Items List */}
              <div className="space-y-2">
                {(!data?.checklist || data.checklist.length === 0) ? (
                  <div className="py-8 text-center text-neutral-500 text-xs">
                    No document items registered for this grant yet.
                  </div>
                ) : (
                  data.checklist.map((item) => {
                    const isReady = item.status === 'Ready' || item.status === 'Submitted';

                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-neutral-950 border border-neutral-800 rounded-md flex items-center justify-between gap-3 group hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleDocStatus(item)}
                            className={`mt-0.5 p-1 rounded transition-colors ${
                              isReady
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                            }`}
                            title="Click to toggle status"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                                {item.category}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-neutral-400 mt-0.5">
                                {item.notes}
                              </p>
                            )}
                            {item.file_name && (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-mono mt-1">
                                <Paperclip className="w-3 h-3" />
                                <span>{item.file_name}</span>
                                <span className="text-neutral-600">·</span>
                                <span>{(item.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => handleToggleDocStatus(item)}
                            className={`text-xs px-2 py-0.5 rounded font-mono ${
                              item.status === 'Submitted'
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                : item.status === 'Ready'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : item.status === 'In Progress'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {item.status}
                          </button>
                          <button
                            onClick={() => handleDeleteChecklistItem(item.id)}
                            className="p-1 text-neutral-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : activeTab === 'compliance' ? (
            /* TAB 3: Post-Award Compliance Reporting */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Post-Award Compliance & Milestones</h4>
                  <p className="text-[11px] text-neutral-400">
                    Mandated progress reports, SGX disclosures, and certified expenditure filings.
                  </p>
                </div>
                <button
                  onClick={onOpenComplianceView}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <span>Open Full Tracker</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {(!data?.compliance_reports || data.compliance_reports.length === 0) ? (
                  <div className="py-8 text-center text-neutral-500 text-xs">
                    No compliance milestones scheduled yet. When this grant is Awarded, financial and narrative reporting cycles can be added.
                  </div>
                ) : (
                  data.compliance_reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 bg-neutral-950 border border-neutral-800 rounded-md space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {report.report_type}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.2 rounded">
                            {report.period_covered}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-neutral-300">
                          Due: {formatDate(report.due_date)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>Accounted: <strong className="font-mono text-white">{formatCurrency(report.amount_accounted)}</strong></span>
                        <span className="text-[11px] text-neutral-500">Reviewer: {report.reviewer || 'Internal'}</span>
                      </div>
                      {report.deliverables_summary && (
                        <p className="text-[11px] text-neutral-400 border-t border-neutral-850 pt-1">
                          {report.deliverables_summary}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* TAB 4: Audit Activity Log */
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-white">Immutable Local Audit Trail</h4>
              <div className="space-y-2 border-l border-neutral-800 pl-4 ml-2">
                {(!data?.activity_log || data.activity_log.length === 0) ? (
                  <div className="py-4 text-neutral-500 text-xs">No recent actions recorded.</div>
                ) : (
                  data.activity_log.map((log) => (
                    <div key={log.id} className="relative pb-3 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -left-[21px] top-1" />
                      <div className="text-neutral-200 font-medium">{log.description}</div>
                      <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>{log.actor}</span>
                        <span>·</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
