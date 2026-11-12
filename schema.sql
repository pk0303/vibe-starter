-- ==============================================================================
-- GrantFlow Desktop: Production SQLite Database Schema
-- File: schema.sql
-- Engine: SQLite 3.x (via better-sqlite3 in Electron / Local-first)
-- ==============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- ------------------------------------------------------------------------------
-- 1. Table: grants
-- Stores the primary grant application lifecycle from prospecting to award
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grants (
    id TEXT PRIMARY KEY NOT NULL,
    grantor_name TEXT NOT NULL,
    program_title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Government Agency', -- 'Government Agency', 'Private Foundation', 'Corporate ESG', 'Research & Education'
    stage TEXT NOT NULL CHECK(stage IN ('Prospecting', 'Drafting', 'Submitted', 'Under Review', 'Awarded', 'Rejected')),
    requested_amount REAL NOT NULL DEFAULT 0.0,
    awarded_amount REAL NOT NULL DEFAULT 0.0,
    submission_deadline TEXT NOT NULL, -- ISO-8601 string 'YYYY-MM-DD'
    decision_date TEXT,               -- ISO-8601 string 'YYYY-MM-DD'
    assigned_lead TEXT NOT NULL,
    lead_email TEXT,
    website_url TEXT,
    notes TEXT,
    tags TEXT DEFAULT '[]',           -- JSON array of strings: e.g. ["ESG", "Innovation"]
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ------------------------------------------------------------------------------
-- 2. Table: document_checklist
-- Itemized required documents and compliance attachments per grant
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_checklist (
    id TEXT PRIMARY KEY NOT NULL,
    grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Proposal', -- 'Proposal', 'Budget', 'Legal & Tax', 'Governance', 'Technical'
    status TEXT NOT NULL CHECK(status IN ('Not Started', 'In Progress', 'Ready', 'Submitted')) DEFAULT 'Not Started',
    due_date TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size_bytes INTEGER DEFAULT 0,
    notes TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ------------------------------------------------------------------------------
-- 3. Table: compliance_reports
-- Post-award financial, narrative, and SGX sustainability/impact report schedule
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_reports (
    id TEXT PRIMARY KEY NOT NULL,
    grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK(report_type IN (
        'Interim Financial Report',
        'Narrative Progress Report',
        'SGX Sustainability & Impact',
        'Final Expenditure Audit',
        'Milestone Deliverable'
    )),
    period_covered TEXT NOT NULL,        -- e.g. 'Q1 2026', 'FY2025 Annual', 'Milestone 2'
    due_date TEXT NOT NULL,             -- ISO-8601 string 'YYYY-MM-DD'
    status TEXT NOT NULL CHECK(status IN ('Upcoming', 'Due Soon', 'Submitted', 'Overdue', 'Approved')) DEFAULT 'Upcoming',
    amount_accounted REAL DEFAULT 0.0,  -- Dollar expenditure certified in this report
    filed_date TEXT,                    -- ISO-8601 string 'YYYY-MM-DD'
    reviewer TEXT,                      -- e.g. 'PwC Compliance Team', 'Board Audit Committee'
    deliverables_summary TEXT,
    document_url TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ------------------------------------------------------------------------------
-- 4. Table: grant_activity_log
-- Audit log recording state transitions, amount revisions, and milestone completions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grant_activity_log (
    id TEXT PRIMARY KEY NOT NULL,
    grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,          -- 'STAGE_CHANGE', 'AMOUNT_UPDATED', 'CHECKLIST_TOGGLED', 'REPORT_FILED'
    description TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'Local User',
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ------------------------------------------------------------------------------
-- Indexes for Sub-Millisecond Desktop Query Performance
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_grants_stage ON grants(stage);
CREATE INDEX IF NOT EXISTS idx_grants_submission_deadline ON grants(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_grants_grantor_name ON grants(grantor_name);
CREATE INDEX IF NOT EXISTS idx_grants_assigned_lead ON grants(assigned_lead);
CREATE INDEX IF NOT EXISTS idx_checklist_grant_id ON document_checklist(grant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_grant_id ON compliance_reports(grant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_due_date ON compliance_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_activity_grant_id ON grant_activity_log(grant_id);

-- ------------------------------------------------------------------------------
-- Triggers: Auto-update updated_at timestamp on grants modification
-- ------------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_grants_updated_at
AFTER UPDATE ON grants
FOR EACH ROW
BEGIN
    UPDATE grants 
    SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') 
    WHERE id = OLD.id;
END;
