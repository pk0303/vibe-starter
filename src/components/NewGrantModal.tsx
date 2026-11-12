import React, { useState } from 'react';
import { X, Plus, Sparkles, Building, Calendar, DollarSign, User } from 'lucide-react';
import type { GrantStage, DocumentCategory } from '../types/grant';
import { dbService } from '../services/db';

interface NewGrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrantCreated: (newGrantId: string) => void;
  initialStage?: GrantStage;
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

const DEFAULT_CHECKLIST_TEMPLATES: Array<{ title: string; category: DocumentCategory; checked: boolean }> = [
  { title: 'Project Proposal & Executive Summary', category: 'Proposal', checked: true },
  { title: 'Itemized Line-Item Budget & Financial Plan', category: 'Budget', checked: true },
  { title: 'Audited Financial Statements (Last 2 Years)', category: 'Legal & Tax', checked: true },
  { title: 'Board Approval Resolution & Governance Letter', category: 'Governance', checked: true },
  { title: 'Technical Architecture & Risk Assessment', category: 'Technical', checked: false },
];

export const NewGrantModal: React.FC<NewGrantModalProps> = ({
  isOpen,
  onClose,
  onGrantCreated,
  initialStage = 'Prospecting',
}) => {
  const [programTitle, setProgramTitle] = useState('');
  const [grantorName, setGrantorName] = useState('');
  const [category, setCategory] = useState('Government Agency');
  const [stage, setStage] = useState<GrantStage>(initialStage);
  const [requestedAmount, setRequestedAmount] = useState<number>(250000);
  const [submissionDeadline, setSubmissionDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [assignedLead, setAssignedLead] = useState('Suzanna Barrett');
  const [leadEmail, setLeadEmail] = useState('suzanna.barrett@grantflow.org');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [templates, setTemplates] = useState(DEFAULT_CHECKLIST_TEMPLATES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programTitle.trim() || !grantorName.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedDocs = templates
        .filter((t) => t.checked)
        .map((t) => ({ title: t.title, category: t.category }));

      const created = await dbService.createGrant(
        {
          program_title: programTitle.trim(),
          grantor_name: grantorName.trim(),
          category,
          stage,
          requested_amount: Number(requestedAmount) || 0,
          awarded_amount: stage === 'Awarded' ? Number(requestedAmount) || 0 : 0,
          submission_deadline: submissionDeadline,
          decision_date: null,
          assigned_lead: assignedLead.trim(),
          lead_email: leadEmail.trim() || null,
          website_url: websiteUrl.trim() || null,
          notes: notes.trim() || null,
          tags: [category.replace(/\s+/g, '')],
        },
        selectedDocs
      );

      onGrantCreated(created.id);
      onClose();
    } catch (err) {
      console.error('Failed to create grant', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTemplate = (index: number) => {
    const next = [...templates];
    next[index].checked = !next[index].checked;
    setTemplates(next);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Create New Grant Application
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 font-medium mb-1">
              Program Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise Productivity Grant (EPG) FY2026"
              value={programTitle}
              onChange={(e) => setProgramTitle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Grantor Agency / Foundation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise Singapore"
                value={grantorName}
                onChange={(e) => setGrantorName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Initial Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as GrantStage)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Requested ($ USD)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Submission Deadline *
              </label>
              <input
                type="date"
                required
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white font-mono focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Assigned Lead *
              </label>
              <input
                type="text"
                required
                value={assignedLead}
                onChange={(e) => setAssignedLead(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Lead Email
              </label>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1">
              Grantor Portal URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1">
              Project Summary & Executive Notes
            </label>
            <textarea
              rows={2}
              placeholder="Outline the core deliverables, milestones, and partner entities..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none"
            />
          </div>

          {/* Document Checklist Auto-Generation */}
          <div className="pt-2 border-t border-neutral-800">
            <span className="block text-neutral-400 font-medium mb-2">
              Auto-generate Initial Document Checklist:
            </span>
            <div className="space-y-1.5 bg-neutral-950 p-3 rounded border border-neutral-800">
              {templates.map((tpl, idx) => (
                <label
                  key={tpl.title}
                  className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={tpl.checked}
                    onChange={() => toggleTemplate(idx)}
                    className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-neutral-300">{tpl.title}</span>
                  <span className="text-[10px] font-mono text-neutral-500 ml-auto">
                    {tpl.category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Writing to SQLite...' : 'Create Grant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
