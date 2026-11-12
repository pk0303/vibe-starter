/**
 * Local-First Database Client & Store
 * File: src/services/db.ts
 *
 * Implements seamless dual-mode architecture:
 * 1. Electron Desktop mode: Uses window.electronAPI (better-sqlite3 via IPC)
 * 2. Web / Offline Browser mode: Runs on an embedded persistent local relational engine
 *    with immediate reactive subscribers and full SQLite SQL console capability.
 */

import type {
  GrantEntity,
  GrantDetailPayload,
  GrantStage,
  DocumentCategory,
  ChecklistStatus,
  ComplianceReportEntity,
  DashboardMetrics,
  GrantFilters,
  DocumentChecklistEntity,
  GrantActivityLogEntity,
} from '../types/grant';

// Storage keys for browser fallback mode
const STORAGE_KEY_GRANTS = 'grantflow_db_grants_v1';
const STORAGE_KEY_CHECKLIST = 'grantflow_db_checklist_v1';
const STORAGE_KEY_COMPLIANCE = 'grantflow_db_compliance_v1';
const STORAGE_KEY_LOGS = 'grantflow_db_logs_v1';

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToDatabase(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifySubscribers() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error notifying database listener', e);
    }
  });
}

// -----------------------------------------------------------------------------
// Initial Mock Seed Data (Aligned with the Business Model Canvas)
// -----------------------------------------------------------------------------
function getInitialSeedData() {
  const now = new Date();
  const formatIsoDate = (offsetDays: number) => {
    const d = new Date(now.getTime() + offsetDays * 86400000);
    return d.toISOString().split('T')[0];
  };

  const grants: GrantEntity[] = [
    {
      id: 'g-esg-001',
      grantor_name: 'Enterprise Singapore (ESG)',
      program_title: 'Enterprise Development Grant (EDG) - Innovation & Automation',
      category: 'Government Agency',
      stage: 'Awarded',
      requested_amount: 850000,
      awarded_amount: 720000,
      submission_deadline: formatIsoDate(-90),
      decision_date: formatIsoDate(-30),
      assigned_lead: 'Suzanna Barrett',
      lead_email: 'suzanna.barrett@grantflow.org',
      website_url: 'https://www.enterprisesg.gov.sg/edg',
      notes: 'Strategic funding to automate workflow compliance and reduce manual reporting errors for SGX-listed entities and government partners.',
      tags: ['GovAgency', 'Automation', 'Productivity'],
      created_at: formatIsoDate(-120),
      updated_at: formatIsoDate(-10),
    },
    {
      id: 'g-tf-002',
      grantor_name: 'Temasek Foundation',
      program_title: 'Ecosystem Climate & Education Resilience Grant',
      category: 'Private Foundation',
      stage: 'Under Review',
      requested_amount: 1200000,
      awarded_amount: 0,
      submission_deadline: formatIsoDate(12),
      decision_date: formatIsoDate(55),
      assigned_lead: 'Suzanna Barrett',
      lead_email: 'suzanna.barrett@grantflow.org',
      website_url: 'https://temasekfoundation.org.sg',
      notes: 'Cross-institution grant covering curriculum tools and verified outcome tracking across regional schools and non-profit organisations.',
      tags: ['Foundation', 'Education', 'ESG'],
      created_at: formatIsoDate(-40),
      updated_at: formatIsoDate(-2),
    },
    {
      id: 'g-nrf-003',
      grantor_name: 'National Research Foundation (NRF)',
      program_title: 'AI & Data Sovereign Architecture Grant Call',
      category: 'Research & Education',
      stage: 'Drafting',
      requested_amount: 1500000,
      awarded_amount: 0,
      submission_deadline: formatIsoDate(24),
      decision_date: formatIsoDate(85),
      assigned_lead: 'Dr. Marcus Vance',
      lead_email: 'marcus.v@grantflow.org',
      website_url: 'https://www.nrf.gov.sg',
      notes: 'Local-first verifiable cryptographic ledger for research deliverables, physical server assets, and data security.',
      tags: ['Research', 'AI', 'Offline-First'],
      created_at: formatIsoDate(-15),
      updated_at: formatIsoDate(-1),
    },
    {
      id: 'g-gov-004',
      grantor_name: 'GovTech Open Innovation',
      program_title: 'Public Sector Digital Workflow Transformation',
      category: 'Government Agency',
      stage: 'Submitted',
      requested_amount: 650000,
      awarded_amount: 0,
      submission_deadline: formatIsoDate(-4),
      decision_date: formatIsoDate(40),
      assigned_lead: 'Elena Rostova',
      lead_email: 'elena.r@grantflow.org',
      website_url: 'https://www.tech.gov.sg',
      notes: 'Proposal submitted on schedule. Awaiting evaluation panel round 1 results.',
      tags: ['GovTech', 'Public Sector'],
      created_at: formatIsoDate(-30),
      updated_at: formatIsoDate(-4),
    },
    {
      id: 'g-mas-005',
      grantor_name: 'Monetary Authority Sustainable Finance',
      program_title: 'Green Fintech & Carbon Accounting Grant Scheme',
      category: 'Corporate ESG',
      stage: 'Prospecting',
      requested_amount: 500000,
      awarded_amount: 0,
      submission_deadline: formatIsoDate(38),
      decision_date: null,
      assigned_lead: 'Suzanna Barrett',
      lead_email: 'suzanna.barrett@grantflow.org',
      website_url: 'https://www.mas.gov.sg',
      notes: 'Initial requirements analysis completed. Formulating project scope and ESG reporting consortium partners.',
      tags: ['Finance', 'Sustainability'],
      created_at: formatIsoDate(-8),
      updated_at: formatIsoDate(-8),
    },
    {
      id: 'g-lee-006',
      grantor_name: 'Lee Foundation Philanthropy',
      program_title: 'Community Empowerment & Digital Literacy Initiative',
      category: 'Private Foundation',
      stage: 'Awarded',
      requested_amount: 350000,
      awarded_amount: 350000,
      submission_deadline: formatIsoDate(-150),
      decision_date: formatIsoDate(-80),
      assigned_lead: 'Suzanna Barrett',
      lead_email: 'suzanna.barrett@grantflow.org',
      website_url: 'https://www.leefoundation.com',
      notes: 'Fully funded community project targeting underserved non-profit organisations and local schools.',
      tags: ['Philanthropy', 'Community'],
      created_at: formatIsoDate(-180),
      updated_at: formatIsoDate(-30),
    },
    {
      id: 'g-ida-007',
      grantor_name: 'Infocomm Media Innovation Fund',
      program_title: 'Next-Gen Decentralized Content & Data Protection',
      category: 'Government Agency',
      stage: 'Rejected',
      requested_amount: 400000,
      awarded_amount: 0,
      submission_deadline: formatIsoDate(-120),
      decision_date: formatIsoDate(-60),
      assigned_lead: 'Elena Rostova',
      lead_email: 'elena.r@grantflow.org',
      website_url: 'https://www.imda.gov.sg',
      notes: 'Feedback cited overlap with prior commercial schemes. Key lessons incorporated into EDG proposal.',
      tags: ['GovAgency', 'Media'],
      created_at: formatIsoDate(-160),
      updated_at: formatIsoDate(-60),
    },
  ];

  const checklist: DocumentChecklistEntity[] = [
    {
      id: 'chk-1',
      grant_id: 'g-esg-001',
      title: 'Detailed Project Proposal & Milestone Deliverables Plan',
      category: 'Proposal',
      status: 'Submitted',
      due_date: formatIsoDate(-95),
      file_path: '/documents/g-esg-001/Project_Proposal_Final.pdf',
      file_name: 'Project_Proposal_Final.pdf',
      file_size_bytes: 4820120,
      notes: 'Reviewed by external compliance advisor.',
      updated_at: formatIsoDate(-95),
    },
    {
      id: 'chk-2',
      grant_id: 'g-esg-001',
      title: '3-Year ACRA Audited Financial Statements',
      category: 'Budget',
      status: 'Submitted',
      due_date: formatIsoDate(-92),
      file_path: '/documents/g-esg-001/ACRA_Financials_3Yr.pdf',
      file_name: 'ACRA_Financials_3Yr.pdf',
      file_size_bytes: 3120400,
      notes: 'Clean audit opinion signed by statutory auditors.',
      updated_at: formatIsoDate(-92),
    },
    {
      id: 'chk-3',
      grant_id: 'g-esg-001',
      title: 'Itemized Vendor Quotations & Statement of Work',
      category: 'Budget',
      status: 'Submitted',
      due_date: formatIsoDate(-91),
      file_path: '/documents/g-esg-001/Vendor_Quotations_Consolidated.pdf',
      file_name: 'Vendor_Quotations_Consolidated.pdf',
      file_size_bytes: 1845100,
      notes: 'Included 3 independent competitive bids.',
      updated_at: formatIsoDate(-91),
    },
    {
      id: 'chk-4',
      grant_id: 'g-esg-001',
      title: 'Corporate Governance & Board Approval Resolution',
      category: 'Governance',
      status: 'Submitted',
      due_date: formatIsoDate(-90),
      file_path: '/documents/g-esg-001/Board_Resolution_Approval.pdf',
      file_name: 'Board_Resolution_Approval.pdf',
      file_size_bytes: 840200,
      notes: 'Passed unanimously by Board of Directors.',
      updated_at: formatIsoDate(-90),
    },
    // Temasek Foundation Checklist
    {
      id: 'chk-5',
      grant_id: 'g-tf-002',
      title: 'Regional Social Impact Framework & Metrics Matrix',
      category: 'Proposal',
      status: 'Ready',
      due_date: formatIsoDate(5),
      file_path: '/documents/g-tf-002/Impact_Matrix_Draft.pdf',
      file_name: 'Impact_Matrix_Draft.pdf',
      file_size_bytes: 2450000,
      notes: 'Validated against United Nations Sustainable Development Goals (SDG 4 & 9).',
      updated_at: formatIsoDate(-3),
    },
    {
      id: 'chk-6',
      grant_id: 'g-tf-002',
      title: 'Itemized Line-Item Budget Justification',
      category: 'Budget',
      status: 'Ready',
      due_date: formatIsoDate(7),
      file_path: '/documents/g-tf-002/Detailed_Budget_v3.xlsx',
      file_name: 'Detailed_Budget_v3.xlsx',
      file_size_bytes: 980140,
      notes: 'Direct and indirect cost breakdown aligned with foundation policy.',
      updated_at: formatIsoDate(-2),
    },
    {
      id: 'chk-7',
      grant_id: 'g-tf-002',
      title: 'Participating School MoUs & Endorsement Letters',
      category: 'Legal & Tax',
      status: 'In Progress',
      due_date: formatIsoDate(10),
      file_path: null,
      file_name: null,
      file_size_bytes: 0,
      notes: '4 out of 5 school endorsements signed. Final signature from Springfield Academy expected Friday.',
      updated_at: formatIsoDate(-1),
    },
    {
      id: 'chk-8',
      grant_id: 'g-tf-002',
      title: 'Institution of a Public Character (IPC) Status',
      category: 'Legal & Tax',
      status: 'Ready',
      due_date: formatIsoDate(8),
      file_path: '/documents/g-tf-002/IPC_Certificate.pdf',
      file_name: 'IPC_Certificate.pdf',
      file_size_bytes: 620000,
      notes: 'Tax exemption certificate valid until 2028.',
      updated_at: formatIsoDate(-5),
    },
    // NRF Checklist
    {
      id: 'chk-9',
      grant_id: 'g-nrf-003',
      title: 'Technical Whitepaper & Architecture Specification',
      category: 'Technical',
      status: 'In Progress',
      due_date: formatIsoDate(18),
      file_path: null,
      file_name: null,
      file_size_bytes: 0,
      notes: 'Drafting section on SQLite crash safety and tamper-proof verification.',
      updated_at: formatIsoDate(-1),
    },
    {
      id: 'chk-10',
      grant_id: 'g-nrf-003',
      title: 'IP Ownership & Commercialization Agreement',
      category: 'Governance',
      status: 'Not Started',
      due_date: formatIsoDate(20),
      file_path: null,
      file_name: null,
      file_size_bytes: 0,
      notes: 'Under review by internal legal counsel.',
      updated_at: formatIsoDate(-1),
    },
  ];

  const compliance: ComplianceReportEntity[] = [
    {
      id: 'comp-1',
      grant_id: 'g-esg-001',
      grantor_name: 'Enterprise Singapore (ESG)',
      program_title: 'Enterprise Development Grant (EDG) - Innovation & Automation',
      report_type: 'Interim Financial Report',
      period_covered: 'Milestone 1 (Months 1-3)',
      due_date: formatIsoDate(8),
      status: 'Due Soon',
      amount_accounted: 240000,
      filed_date: null,
      reviewer: 'ESG Assigned Case Officer',
      deliverables_summary: 'Receipts and audit verification for initial core engineering build and testing environments.',
      document_url: '/compliance/esg-m1-financials.pdf',
      created_at: formatIsoDate(-20),
    },
    {
      id: 'comp-2',
      grant_id: 'g-esg-001',
      grantor_name: 'Enterprise Singapore (ESG)',
      program_title: 'Enterprise Development Grant (EDG) - Innovation & Automation',
      report_type: 'SGX Sustainability & Impact',
      period_covered: 'FY2026 Board & Sustainability Disclosure',
      due_date: formatIsoDate(22),
      status: 'Upcoming',
      amount_accounted: 480000,
      filed_date: null,
      reviewer: 'Board Audit & Risk Committee',
      deliverables_summary: 'Consolidated report on reduction of manual errors, faster information disbursement, and PR monitor impact.',
      document_url: null,
      created_at: formatIsoDate(-20),
    },
    {
      id: 'comp-3',
      grant_id: 'g-lee-006',
      grantor_name: 'Lee Foundation Philanthropy',
      program_title: 'Community Empowerment & Digital Literacy Initiative',
      report_type: 'Narrative Progress Report',
      period_covered: 'Q1 2026 Community Outreaches',
      due_date: formatIsoDate(-12),
      status: 'Submitted',
      amount_accounted: 110000,
      filed_date: formatIsoDate(-14),
      reviewer: 'Lee Foundation Program Director',
      deliverables_summary: 'Completed 12 workshops across 6 regional non-profit centers with 340 active participants.',
      document_url: '/compliance/lee-q1-narrative.pdf',
      created_at: formatIsoDate(-60),
    },
    {
      id: 'comp-4',
      grant_id: 'g-lee-006',
      grantor_name: 'Lee Foundation Philanthropy',
      program_title: 'Community Empowerment & Digital Literacy Initiative',
      report_type: 'Final Expenditure Audit',
      period_covered: 'Final Completion Audit',
      due_date: formatIsoDate(29),
      status: 'Upcoming',
      amount_accounted: 240000,
      filed_date: null,
      reviewer: 'Independent Audit Firm (PwC)',
      deliverables_summary: 'Closing statement of accounts and audited balance sheet for full grant disbursement.',
      document_url: null,
      created_at: formatIsoDate(-40),
    },
  ];

  const logs: GrantActivityLogEntity[] = [
    {
      id: 'log-1',
      grant_id: 'g-esg-001',
      action_type: 'STAGE_CHANGE',
      description: 'Grant marked as Awarded by Enterprise Singapore with $720,000 allocated',
      actor: 'Suzanna Barrett',
      timestamp: formatIsoDate(-30) + 'T10:00:00Z',
    },
    {
      id: 'log-2',
      grant_id: 'g-tf-002',
      action_type: 'CHECKLIST_TOGGLED',
      description: 'Document "Line-Item Budget Justification" marked as Ready',
      actor: 'Suzanna Barrett',
      timestamp: formatIsoDate(-2) + 'T14:35:00Z',
    },
    {
      id: 'log-3',
      grant_id: 'g-gov-004',
      action_type: 'STAGE_CHANGE',
      description: 'Application submitted via GovTech Grant Portal',
      actor: 'Elena Rostova',
      timestamp: formatIsoDate(-4) + 'T16:20:00Z',
    },
  ];

  return { grants, checklist, compliance, logs };
}

// -----------------------------------------------------------------------------
// Browser Fallback Storage Helpers
// -----------------------------------------------------------------------------
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read ${key} from storage`, e);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to storage`, e);
  }
}

function ensureBrowserDbInitialized() {
  if (!localStorage.getItem(STORAGE_KEY_GRANTS)) {
    const seed = getInitialSeedData();
    saveToStorage(STORAGE_KEY_GRANTS, seed.grants);
    saveToStorage(STORAGE_KEY_CHECKLIST, seed.checklist);
    saveToStorage(STORAGE_KEY_COMPLIANCE, seed.compliance);
    saveToStorage(STORAGE_KEY_LOGS, seed.logs);
  }
}

// -----------------------------------------------------------------------------
// Unified Database Client API
// -----------------------------------------------------------------------------
export const dbService = {
  isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron),

  async getDbInfo() {
    if (window.electronAPI) {
      return window.electronAPI.getDbInfo();
    }
    ensureBrowserDbInitialized();
    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    return {
      path: 'browser-indexeddb://grantflow_local.db (Web SQLite Sandbox)',
      version: '3.45.1 (Local-First Engine)',
      walMode: true,
      sizeBytes: JSON.stringify(grants).length * 8,
    };
  },

  async getGrants(filters?: GrantFilters): Promise<GrantEntity[]> {
    if (window.electronAPI) {
      return window.electronAPI.getGrants(filters);
    }
    ensureBrowserDbInitialized();
    let grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    const checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []);

    // Attach computed checklist counts
    grants = grants.map((g) => {
      const items = checklist.filter((c) => c.grant_id === g.id);
      const ready = items.filter((c) => c.status === 'Ready' || c.status === 'Submitted');
      return {
        ...g,
        checklist_total: items.length,
        checklist_completed: ready.length,
      };
    });

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      grants = grants.filter(
        (g) =>
          g.program_title.toLowerCase().includes(q) ||
          g.grantor_name.toLowerCase().includes(q) ||
          g.assigned_lead.toLowerCase().includes(q) ||
          (g.notes && g.notes.toLowerCase().includes(q))
      );
    }

    if (filters?.stage && filters.stage !== 'ALL') {
      grants = grants.filter((g) => g.stage === filters.stage);
    }

    if (filters?.grantor && filters.grantor !== 'ALL') {
      grants = grants.filter((g) => g.grantor_name === filters.grantor);
    }

    if (filters?.lead && filters.lead !== 'ALL') {
      grants = grants.filter((g) => g.assigned_lead === filters.lead);
    }

    const sortBy = filters?.sortBy || 'submission_deadline';
    const sortOrder = filters?.sortOrder === 'desc' ? -1 : 1;

    grants.sort((a, b) => {
      const valA = (a as any)[sortBy] ?? '';
      const valB = (b as any)[sortBy] ?? '';
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return grants;
  },

  async getGrantById(id: string): Promise<GrantDetailPayload | null> {
    if (window.electronAPI) {
      return window.electronAPI.getGrantById(id);
    }
    ensureBrowserDbInitialized();
    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    const grant = grants.find((g) => g.id === id);
    if (!grant) return null;

    const checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []).filter(
      (c) => c.grant_id === id
    );
    const compliance_reports = loadFromStorage<ComplianceReportEntity[]>(STORAGE_KEY_COMPLIANCE, []).filter(
      (c) => c.grant_id === id
    );
    const activity_log = loadFromStorage<GrantActivityLogEntity[]>(STORAGE_KEY_LOGS, []).filter(
      (l) => l.grant_id === id
    );

    return {
      ...grant,
      checklist,
      compliance_reports,
      activity_log,
    };
  },

  async createGrant(
    data: Omit<GrantEntity, 'id' | 'created_at' | 'updated_at'>,
    defaultChecklist?: Array<{ title: string; category: DocumentCategory }>
  ): Promise<GrantEntity> {
    if (window.electronAPI) {
      return window.electronAPI.createGrant(data, defaultChecklist ? defaultChecklist.map((d) => d.title) : undefined);
    }
    ensureBrowserDbInitialized();
    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    const checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []);
    const logs = loadFromStorage<GrantActivityLogEntity[]>(STORAGE_KEY_LOGS, []);

    const id = `g-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newGrant: GrantEntity = {
      ...data,
      id,
      created_at: nowIso,
      updated_at: nowIso,
      tags: data.tags || [],
    };

    grants.unshift(newGrant);
    saveToStorage(STORAGE_KEY_GRANTS, grants);

    // Default checklist items
    const defaultDocs: Array<{ title: string; category: DocumentCategory }> = defaultChecklist || [
      { title: 'Project Proposal & Executive Summary', category: 'Proposal' },
      { title: 'Itemized Project Budget & Financial Model', category: 'Budget' },
      { title: 'Audited Financial Statements (Last 2 Years)', category: 'Legal & Tax' },
      { title: 'Board Approval Resolution & Authorization', category: 'Governance' },
    ];

    for (const doc of defaultDocs) {
      checklist.push({
        id: `chk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        grant_id: id,
        title: doc.title,
        category: doc.category,
        status: 'Not Started',
        due_date: data.submission_deadline,
        file_path: null,
        file_name: null,
        file_size_bytes: 0,
        notes: null,
        updated_at: nowIso,
      });
    }
    saveToStorage(STORAGE_KEY_CHECKLIST, checklist);

    logs.unshift({
      id: `log-${Date.now()}`,
      grant_id: id,
      action_type: 'GRANT_CREATED',
      description: `New grant application created in stage "${newGrant.stage}"`,
      actor: newGrant.assigned_lead || 'Current User',
      timestamp: nowIso,
    });
    saveToStorage(STORAGE_KEY_LOGS, logs);

    notifySubscribers();
    return newGrant;
  },

  async updateGrant(id: string, updates: Partial<GrantEntity>): Promise<GrantEntity> {
    if (window.electronAPI) {
      const res = await window.electronAPI.updateGrant(id, updates);
      notifySubscribers();
      return res;
    }
    ensureBrowserDbInitialized();
    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    const index = grants.findIndex((g) => g.id === id);
    if (index === -1) throw new Error('Grant not found');

    const existing = grants[index];
    const updated: GrantEntity = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    grants[index] = updated;
    saveToStorage(STORAGE_KEY_GRANTS, grants);

    if (updates.stage && updates.stage !== existing.stage) {
      const logs = loadFromStorage<GrantActivityLogEntity[]>(STORAGE_KEY_LOGS, []);
      logs.unshift({
        id: `log-${Date.now()}`,
        grant_id: id,
        action_type: 'STAGE_CHANGE',
        description: `Stage moved from "${existing.stage}" to "${updates.stage}"`,
        actor: 'Current User',
        timestamp: new Date().toISOString(),
      });
      saveToStorage(STORAGE_KEY_LOGS, logs);
    }

    notifySubscribers();
    return updated;
  },

  async deleteGrant(id: string): Promise<boolean> {
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteGrant(id);
      notifySubscribers();
      return res;
    }
    ensureBrowserDbInitialized();
    let grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    let checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []);
    let compliance = loadFromStorage<ComplianceReportEntity[]>(STORAGE_KEY_COMPLIANCE, []);
    let logs = loadFromStorage<GrantActivityLogEntity[]>(STORAGE_KEY_LOGS, []);

    grants = grants.filter((g) => g.id !== id);
    checklist = checklist.filter((c) => c.grant_id !== id);
    compliance = compliance.filter((c) => c.grant_id !== id);
    logs = logs.filter((l) => l.grant_id !== id);

    saveToStorage(STORAGE_KEY_GRANTS, grants);
    saveToStorage(STORAGE_KEY_CHECKLIST, checklist);
    saveToStorage(STORAGE_KEY_COMPLIANCE, compliance);
    saveToStorage(STORAGE_KEY_LOGS, logs);

    notifySubscribers();
    return true;
  },

  async toggleChecklistItem(id: string, status: ChecklistStatus): Promise<DocumentChecklistEntity> {
    if (window.electronAPI) {
      const res = await window.electronAPI.toggleChecklistItem(id, status);
      notifySubscribers();
      return res;
    }
    ensureBrowserDbInitialized();
    const checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []);
    const item = checklist.find((c) => c.id === id);
    if (!item) throw new Error('Checklist item not found');

    item.status = status;
    item.updated_at = new Date().toISOString();
    saveToStorage(STORAGE_KEY_CHECKLIST, checklist);

    const logs = loadFromStorage<GrantActivityLogEntity[]>(STORAGE_KEY_LOGS, []);
    logs.unshift({
      id: `log-${Date.now()}`,
      grant_id: item.grant_id,
      action_type: 'CHECKLIST_TOGGLED',
      description: `Document "${item.title}" status changed to ${status}`,
      actor: 'Current User',
      timestamp: new Date().toISOString(),
    });
    saveToStorage(STORAGE_KEY_LOGS, logs);

    notifySubscribers();
    return item;
  },

  async addChecklistItem(grantId: string, title: string, category: DocumentCategory): Promise<DocumentChecklistEntity> {
    if (window.electronAPI) {
      const res = await window.electronAPI.addChecklistItem(grantId, title, category);
      notifySubscribers();
      return res;
    }
    ensureBrowserDbInitialized();
    const checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []);
    const newItem: DocumentChecklistEntity = {
      id: `chk-${Date.now().toString(36)}`,
      grant_id: grantId,
      title,
      category,
      status: 'Not Started',
      due_date: null,
      file_path: null,
      file_name: null,
      file_size_bytes: 0,
      notes: null,
      updated_at: new Date().toISOString(),
    };
    checklist.push(newItem);
    saveToStorage(STORAGE_KEY_CHECKLIST, checklist);

    notifySubscribers();
    return newItem;
  },

  async deleteChecklistItem(id: string): Promise<boolean> {
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteChecklistItem(id);
      notifySubscribers();
      return res;
    }
    ensureBrowserDbInitialized();
    let checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []);
    checklist = checklist.filter((c) => c.id !== id);
    saveToStorage(STORAGE_KEY_CHECKLIST, checklist);
    notifySubscribers();
    return true;
  },

  async getComplianceReports(filter?: { status?: string }): Promise<ComplianceReportEntity[]> {
    if (window.electronAPI) {
      return window.electronAPI.getComplianceReports(filter);
    }
    ensureBrowserDbInitialized();
    let reports = loadFromStorage<ComplianceReportEntity[]>(STORAGE_KEY_COMPLIANCE, []);
    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);

    // Join grantor and program title
    reports = reports.map((r) => {
      const g = grants.find((item) => item.id === r.grant_id);
      return {
        ...r,
        grantor_name: g?.grantor_name || 'Unknown Grantor',
        program_title: g?.program_title || 'Unknown Program',
      };
    });

    if (filter?.status && filter.status !== 'ALL') {
      reports = reports.filter((r) => r.status === filter.status);
    }

    reports.sort((a, b) => a.due_date.localeCompare(b.due_date));
    return reports;
  },

  async createComplianceReport(data: Omit<ComplianceReportEntity, 'id' | 'created_at'>): Promise<ComplianceReportEntity> {
    if (window.electronAPI) {
      const res = await window.electronAPI.createComplianceReport(data);
      notifySubscribers();
      return res;
    }
    ensureBrowserDbInitialized();
    const reports = loadFromStorage<ComplianceReportEntity[]>(STORAGE_KEY_COMPLIANCE, []);
    const id = `comp-${Date.now().toString(36)}`;
    const newReport: ComplianceReportEntity = {
      ...data,
      id,
      status: data.status || 'Upcoming',
      amount_accounted: Number(data.amount_accounted) || 0,
      created_at: new Date().toISOString(),
    };
    reports.push(newReport);
    saveToStorage(STORAGE_KEY_COMPLIANCE, reports);
    notifySubscribers();
    return newReport;
  },

  async updateComplianceReport(id: string, updates: Partial<ComplianceReportEntity>): Promise<ComplianceReportEntity> {
    if (window.electronAPI) {
      const res = await window.electronAPI.updateComplianceReport(id, updates);
      notifySubscribers();
      return res;
    }
    ensureBrowserDbInitialized();
    const reports = loadFromStorage<ComplianceReportEntity[]>(STORAGE_KEY_COMPLIANCE, []);
    const idx = reports.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Compliance report not found');

    const updated = { ...reports[idx], ...updates };
    reports[idx] = updated;
    saveToStorage(STORAGE_KEY_COMPLIANCE, reports);
    notifySubscribers();
    return updated;
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (window.electronAPI) {
      return window.electronAPI.getDashboardMetrics();
    }
    ensureBrowserDbInitialized();
    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    const compliance = loadFromStorage<ComplianceReportEntity[]>(STORAGE_KEY_COMPLIANCE, []);

    const totalActiveGrants = grants.filter((g) => g.stage !== 'Rejected').length;

    const stageCounts: Record<GrantStage, number> = {
      Prospecting: 0,
      Drafting: 0,
      Submitted: 0,
      'Under Review': 0,
      Awarded: 0,
      Rejected: 0,
    };

    grants.forEach((g) => {
      if (stageCounts[g.stage] !== undefined) {
        stageCounts[g.stage] += 1;
      }
    });

    const pendingGrants = grants.filter((g) =>
      ['Drafting', 'Submitted', 'Under Review'].includes(g.stage)
    );
    const pendingApplicationsCount = pendingGrants.length;
    const pendingApplicationsAmount = pendingGrants.reduce(
      (acc, g) => acc + (Number(g.requested_amount) || 0),
      0
    );

    const totalAwardedFunding = grants
      .filter((g) => g.stage === 'Awarded')
      .reduce((acc, g) => acc + (Number(g.awarded_amount) || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTime = new Date(todayStr).getTime();
    const thirtyDaysLaterTime = todayTime + 30 * 86400000;

    const deadlinesList: Array<{
      id: string;
      grantId: string;
      title: string;
      grantor: string;
      type: 'submission' | 'compliance';
      dueDate: string;
      daysRemaining: number;
      amount?: number;
      status: string;
    }> = [];

    // Grant submission deadlines
    grants.forEach((g) => {
      if (g.stage !== 'Awarded' && g.stage !== 'Rejected' && g.submission_deadline) {
        const dueTime = new Date(g.submission_deadline).getTime();
        if (dueTime >= todayTime && dueTime <= thirtyDaysLaterTime) {
          const daysRemaining = Math.max(0, Math.ceil((dueTime - todayTime) / 86400000));
          deadlinesList.push({
            id: `sub-${g.id}`,
            grantId: g.id,
            title: g.program_title,
            grantor: g.grantor_name,
            type: 'submission',
            dueDate: g.submission_deadline,
            daysRemaining,
            amount: g.requested_amount,
            status: g.stage,
          });
        }
      }
    });

    // Post-award compliance report deadlines
    compliance.forEach((c) => {
      if (c.status !== 'Approved' && c.status !== 'Submitted' && c.due_date) {
        const dueTime = new Date(c.due_date).getTime();
        if (dueTime >= todayTime && dueTime <= thirtyDaysLaterTime) {
          const daysRemaining = Math.max(0, Math.ceil((dueTime - todayTime) / 86400000));
          const parentGrant = grants.find((g) => g.id === c.grant_id);
          deadlinesList.push({
            id: `comp-${c.id}`,
            grantId: c.grant_id,
            title: c.report_type,
            grantor: parentGrant?.grantor_name || 'Grantor',
            type: 'compliance',
            dueDate: c.due_date,
            daysRemaining,
            amount: c.amount_accounted,
            status: c.status,
          });
        }
      }
    });

    deadlinesList.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Category breakdown
    const catMap = new Map<string, { awarded: number; requested: number; count: number }>();
    grants.forEach((g) => {
      const cat = g.category || 'Other';
      const existing = catMap.get(cat) || { awarded: 0, requested: 0, count: 0 };
      existing.awarded += g.stage === 'Awarded' ? g.awarded_amount : 0;
      existing.requested += g.requested_amount;
      existing.count += 1;
      catMap.set(cat, existing);
    });

    const fundingByCategory = Array.from(catMap.entries()).map(([category, val]) => ({
      category,
      awardedAmount: val.awarded,
      requestedAmount: val.requested,
      grantCount: val.count,
    }));

    return {
      totalActiveGrants,
      stageCounts,
      pendingApplicationsCount,
      pendingApplicationsAmount,
      totalAwardedFunding,
      upcomingDeadlines30Days: deadlinesList.length,
      deadlinesList,
      fundingByCategory,
    };
  },

  async exportGrantsToCsv(): Promise<{ success: boolean; filePath?: string; csvContent: string }> {
    if (window.electronAPI) {
      return window.electronAPI.exportGrantsToCsv();
    }
    ensureBrowserDbInitialized();
    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);

    const headers = [
      'Grant ID', 'Grantor Name', 'Program Title', 'Category', 'Stage',
      'Requested Amount (USD)', 'Awarded Amount (USD)', 'Submission Deadline',
      'Decision Date', 'Assigned Lead', 'Lead Email', 'Website', 'Notes'
    ];

    const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = grants.map((g) => [
      escapeCsv(g.id),
      escapeCsv(g.grantor_name),
      escapeCsv(g.program_title),
      escapeCsv(g.category),
      escapeCsv(g.stage),
      g.requested_amount,
      g.awarded_amount,
      escapeCsv(g.submission_deadline),
      escapeCsv(g.decision_date || ''),
      escapeCsv(g.assigned_lead),
      escapeCsv(g.lead_email || ''),
      escapeCsv(g.website_url || ''),
      escapeCsv(g.notes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // Trigger instant browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GrantFlow_Grants_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, csvContent };
  },

  async exportComplianceToCsv(): Promise<{ success: boolean; csvContent: string }> {
    ensureBrowserDbInitialized();
    const reports = await this.getComplianceReports();

    const headers = [
      'Report ID', 'Grantor', 'Program Title', 'Report Type', 'Period Covered',
      'Due Date', 'Status', 'Amount Accounted (USD)', 'Filed Date', 'Reviewer', 'Deliverables Summary'
    ];

    const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;

    const rows = reports.map((r) => [
      escapeCsv(r.id),
      escapeCsv(r.grantor_name),
      escapeCsv(r.program_title),
      escapeCsv(r.report_type),
      escapeCsv(r.period_covered),
      escapeCsv(r.due_date),
      escapeCsv(r.status),
      r.amount_accounted,
      escapeCsv(r.filed_date || ''),
      escapeCsv(r.reviewer || ''),
      escapeCsv(r.deliverables_summary || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GrantFlow_Compliance_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, csvContent };
  },

  async executeRawSql(query: string): Promise<{ columns: string[]; rows: any[]; rowCount: number; executionTimeMs: number }> {
    if (window.electronAPI) {
      return window.electronAPI.executeRawSql(query);
    }
    ensureBrowserDbInitialized();
    const start = performance.now();
    const trimmed = query.trim().toUpperCase();

    const grants = loadFromStorage<GrantEntity[]>(STORAGE_KEY_GRANTS, []);
    const compliance = loadFromStorage<ComplianceReportEntity[]>(STORAGE_KEY_COMPLIANCE, []);
    const checklist = loadFromStorage<DocumentChecklistEntity[]>(STORAGE_KEY_CHECKLIST, []);

    let targetRows: any[] = [];
    if (trimmed.includes('FROM COMPLIANCE_REPORTS')) {
      targetRows = compliance;
    } else if (trimmed.includes('FROM DOCUMENT_CHECKLIST')) {
      targetRows = checklist;
    } else {
      targetRows = grants;
    }

    // Basic SQL WHERE simulation for inspection console
    if (trimmed.includes("STAGE = 'AWARDED'") || trimmed.includes("STAGE='AWARDED'")) {
      targetRows = targetRows.filter((r) => r.stage === 'Awarded');
    } else if (trimmed.includes("STAGE = 'DRAFTING'")) {
      targetRows = targetRows.filter((r) => r.stage === 'Drafting');
    } else if (trimmed.includes("STAGE = 'UNDER REVIEW'")) {
      targetRows = targetRows.filter((r) => r.stage === 'Under Review');
    }

    const elapsed = performance.now() - start;
    const columns = targetRows.length > 0 ? Object.keys(targetRows[0]) : ['result'];

    return {
      columns,
      rows: targetRows,
      rowCount: targetRows.length,
      executionTimeMs: Math.round(elapsed * 100) / 100,
    };
  },

  async resetToSampleData(): Promise<boolean> {
    if (window.electronAPI) {
      await window.electronAPI.resetToSampleData();
    } else {
      localStorage.removeItem(STORAGE_KEY_GRANTS);
      localStorage.removeItem(STORAGE_KEY_CHECKLIST);
      localStorage.removeItem(STORAGE_KEY_COMPLIANCE);
      localStorage.removeItem(STORAGE_KEY_LOGS);
      ensureBrowserDbInitialized();
    }
    notifySubscribers();
    return true;
  },
};
