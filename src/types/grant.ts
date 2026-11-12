export type GrantStage =
  | 'Prospecting'
  | 'Drafting'
  | 'Submitted'
  | 'Under Review'
  | 'Awarded'
  | 'Rejected';

export type DocumentCategory =
  | 'Proposal'
  | 'Budget'
  | 'Legal & Tax'
  | 'Governance'
  | 'Technical';

export type ChecklistStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Ready'
  | 'Submitted';

export type ComplianceReportType =
  | 'Interim Financial Report'
  | 'Narrative Progress Report'
  | 'SGX Sustainability & Impact'
  | 'Final Expenditure Audit'
  | 'Milestone Deliverable';

export type ComplianceStatus =
  | 'Upcoming'
  | 'Due Soon'
  | 'Submitted'
  | 'Overdue'
  | 'Approved';

export interface GrantEntity {
  id: string;
  grantor_name: string;
  program_title: string;
  category: string;
  stage: GrantStage;
  requested_amount: number;
  awarded_amount: number;
  submission_deadline: string;
  decision_date: string | null;
  assigned_lead: string;
  lead_email: string | null;
  website_url: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  checklist_total?: number;
  checklist_completed?: number;
}

export interface DocumentChecklistEntity {
  id: string;
  grant_id: string;
  title: string;
  category: DocumentCategory;
  status: ChecklistStatus;
  due_date: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size_bytes: number;
  notes: string | null;
  updated_at: string;
}

export interface ComplianceReportEntity {
  id: string;
  grant_id: string;
  grantor_name?: string;
  program_title?: string;
  report_type: ComplianceReportType;
  period_covered: string;
  due_date: string;
  status: ComplianceStatus;
  amount_accounted: number;
  filed_date: string | null;
  reviewer: string | null;
  deliverables_summary: string | null;
  document_url: string | null;
  created_at: string;
}

export interface GrantActivityLogEntity {
  id: string;
  grant_id: string;
  action_type: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface GrantDetailPayload extends GrantEntity {
  checklist: DocumentChecklistEntity[];
  compliance_reports: ComplianceReportEntity[];
  activity_log: GrantActivityLogEntity[];
}

export interface DashboardMetrics {
  totalActiveGrants: number;
  stageCounts: Record<GrantStage, number>;
  pendingApplicationsCount: number;
  pendingApplicationsAmount: number;
  totalAwardedFunding: number;
  upcomingDeadlines30Days: number;
  deadlinesList: Array<{
    id: string;
    grantId: string;
    title: string;
    grantor: string;
    type: 'submission' | 'compliance';
    dueDate: string;
    daysRemaining: number;
    amount?: number;
    status: string;
  }>;
  fundingByCategory: Array<{
    category: string;
    awardedAmount: number;
    requestedAmount: number;
    grantCount: number;
  }>;
}

export interface GrantFilters {
  search?: string;
  stage?: GrantStage | 'ALL';
  grantor?: string | 'ALL';
  lead?: string | 'ALL';
  sortBy?: 'submission_deadline' | 'requested_amount' | 'awarded_amount' | 'grantor_name' | 'program_title';
  sortOrder?: 'asc' | 'desc';
}

declare global {
  interface Window {
    electronAPI?: any;
  }
}

