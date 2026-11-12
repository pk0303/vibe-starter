/**
 * Electron Main Process
 * File: electron/main.ts
 * 
 * Local-First Grant Management Desktop Architecture
 * - Uses better-sqlite3 for synchronous, high-throughput local database operations
 * - Implements secure IPC handlers with parameterized SQL queries
 * - Handles native dialogs for CSV exports and SQLite database lifecycle
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import type {
  GrantEntity,
  GrantStage,
  GrantFilters,
  DocumentCategory,
  ChecklistStatus,
  ComplianceReportEntity,
  ComplianceStatus
} from './types';

let mainWindow: BrowserWindow | null = null;
let db: DatabaseType | null = null;

// ==============================================================================
// 1. SQLite Database Initialization & Schema Migrations
// ==============================================================================
function initDatabase(): DatabaseType {
  const isDev = !app.isPackaged;
  const dbDir = isDev
    ? path.join(__dirname, '..')
    : app.getPath('userData');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'grantflow_local.db');
  console.log(`[SQLite] Initializing local database at: ${dbPath}`);

  const sqlite = new Database(dbPath, {
    verbose: isDev ? console.log : undefined,
  });

  // Enable WAL mode for zero-lock concurrency and crash resistance
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');

  // Load and apply schema.sql
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    sqlite.exec(schemaSql);
    console.log('[SQLite] schema.sql verified and applied.');
  }

  // Ensure default seed data exists if table is empty
  const countRow = sqlite.prepare('SELECT COUNT(*) as count FROM grants').get() as { count: number };
  if (countRow.count === 0) {
    seedInitialData(sqlite);
  }

  return sqlite;
}

function seedInitialData(sqlite: DatabaseType) {
  console.log('[SQLite] Seeding initial local grants and compliance records...');
  const insertGrant = sqlite.prepare(`
    INSERT INTO grants (
      id, grantor_name, program_title, category, stage,
      requested_amount, awarded_amount, submission_deadline,
      decision_date, assigned_lead, lead_email, website_url, notes, tags
    ) VALUES (
      @id, @grantor_name, @program_title, @category, @stage,
      @requested_amount, @awarded_amount, @submission_deadline,
      @decision_date, @assigned_lead, @lead_email, @website_url, @notes, @tags
    )
  `);

  const insertChecklist = sqlite.prepare(`
    INSERT INTO document_checklist (id, grant_id, title, category, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertCompliance = sqlite.prepare(`
    INSERT INTO compliance_reports (
      id, grant_id, report_type, period_covered, due_date, status, amount_accounted, reviewer, deliverables_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const formatIsoDate = (d: Date) => d.toISOString().split('T')[0];

  const inDays = (days: number) => {
    const d = new Date();
    d.setDate(now.getDate() + days);
    return formatIsoDate(d);
  };

  const seedTx = sqlite.transaction(() => {
    // 1. Enterprise Singapore - ESG Innovation
    insertGrant.run({
      id: 'g-esg-001',
      grantor_name: 'Enterprise Singapore (ESG)',
      program_title: 'Enterprise Development Grant (EDG) - Innovation & Productivity',
      category: 'Government Agency',
      stage: 'Awarded',
      requested_amount: 850000,
      awarded_amount: 720000,
      submission_deadline: inDays(-90),
      decision_date: inDays(-30),
      assigned_lead: 'Suzanna Barrett',
      lead_email: 'suzanna.barrett@grantflow.org',
      website_url: 'https://www.enterprisesg.gov.sg/edg',
      notes: 'Strategic funding to automate workflow compliance and reduce manual reporting errors for SGX-listed entities.',
      tags: JSON.stringify(['GovAgency', 'Automation', 'Productivity']),
    });

    // 2. Temasek Foundation
    insertGrant.run({
      id: 'g-tf-002',
      grantor_name: 'Temasek Foundation',
      program_title: 'Ecosystem Climate & Education Resilience Grant',
      category: 'Private Foundation',
      stage: 'Under Review',
      requested_amount: 1200000,
      awarded_amount: 0,
      submission_deadline: inDays(14),
      decision_date: inDays(60),
      assigned_lead: 'Suzanna Barrett',
      lead_email: 'suzanna.barrett@grantflow.org',
      website_url: 'https://temasekfoundation.org.sg',
      notes: 'Cross-institution grant covering curriculum tools and verified outcome tracking across regional schools.',
      tags: JSON.stringify(['Foundation', 'Education', 'ESG']),
    });

    // 3. National Research Foundation (NRF)
    insertGrant.run({
      id: 'g-nrf-003',
      grantor_name: 'National Research Foundation (NRF)',
      program_title: 'AI & Data Sovereign Architecture Grant Call',
      category: 'Research & Education',
      stage: 'Drafting',
      requested_amount: 1500000,
      awarded_amount: 0,
      submission_deadline: inDays(22),
      decision_date: inDays(90),
      assigned_lead: 'Dr. Marcus Vance',
      lead_email: 'marcus.v@grantflow.org',
      website_url: 'https://www.nrf.gov.sg',
      notes: 'Local-first offline verifiable cryptographic ledger for research deliverables.',
      tags: JSON.stringify(['Research', 'AI', 'Offline-First']),
    });

    // 4. GovTech Open Grant
    insertGrant.run({
      id: 'g-gov-004',
      grantor_name: 'GovTech Open Innovation',
      program_title: 'Public Sector Digital Workflow Transformation',
      category: 'Government Agency',
      stage: 'Submitted',
      requested_amount: 650000,
      awarded_amount: 0,
      submission_deadline: inDays(-5),
      decision_date: inDays(45),
      assigned_lead: 'Elena Rostova',
      lead_email: 'elena.r@grantflow.org',
      website_url: 'https://www.tech.gov.sg',
      notes: 'Proposal submitted on schedule. Awaiting evaluation panel round 1 results.',
      tags: JSON.stringify(['GovTech', 'Public Sector']),
    });

    // 5. Global Green Tech Catalyst
    insertGrant.run({
      id: 'g-ggt-005',
      grantor_name: 'Monetary Authority Sustainable Finance Initiative',
      program_title: 'Green Fintech & Carbon Accounting Grant',
      category: 'Corporate ESG',
      stage: 'Prospecting',
      requested_amount: 500000,
      awarded_amount: 0,
      submission_deadline: inDays(42),
      decision_date: null,
      assigned_lead: 'Suzanna Barrett',
      lead_email: 'suzanna.barrett@grantflow.org',
      website_url: 'https://www.mas.gov.sg',
      notes: 'Initial requirements analysis completed. Formulating project scope and consortium partners.',
      tags: JSON.stringify(['Finance', 'Sustainability']),
    });

    // Checklists for EDG
    insertChecklist.run('chk-1', 'g-esg-001', 'Detailed Project Proposal & Milestone Plan', 'Proposal', 'Submitted', inDays(-100));
    insertChecklist.run('chk-2', 'g-esg-001', '3-Year Audited Financial Statements (ACRA)', 'Budget', 'Submitted', inDays(-95));
    insertChecklist.run('chk-3', 'g-esg-001', 'Consultant Quotations & Scopes of Work', 'Budget', 'Submitted', inDays(-92));
    insertChecklist.run('chk-4', 'g-esg-001', 'Corporate Governance & Board Approval Resolution', 'Governance', 'Submitted', inDays(-90));

    // Checklists for Temasek Foundation
    insertChecklist.run('chk-5', 'g-tf-002', 'Narrative Impact Framework & KPI Matrix', 'Proposal', 'Ready', inDays(10));
    insertChecklist.run('chk-6', 'g-tf-002', 'Itemized Line-Item Budget Justification', 'Budget', 'Ready', inDays(12));
    insertChecklist.run('chk-7', 'g-tf-002', 'Partner School MoUs and Endorsements', 'Legal & Tax', 'In Progress', inDays(13));
    insertChecklist.run('chk-8', 'g-tf-002', 'Charity / IPC Status Documentation', 'Legal & Tax', 'Ready', inDays(10));

    // Compliance reports for Awarded grant
    insertCompliance.run(
      'comp-1',
      'g-esg-001',
      'Interim Financial Report',
      'Milestone 1 (Months 1-3)',
      inDays(18),
      'Due Soon',
      240000,
      'Internal Compliance Officer',
      'Receipts and audit slips for initial engineering talent and hardware procurement.'
    );
    insertCompliance.run(
      'comp-2',
      'g-esg-001',
      'SGX Sustainability & Impact',
      'FY2026 Annual Board Disclosures',
      inDays(28),
      'Upcoming',
      480000,
      'Board ESG Committee',
      'Disbursement verification and PR monitoring metrics for SGX reporting.'
    );
  });

  seedTx();
  console.log('[SQLite] Seed data populated successfully.');
}

// ==============================================================================
// 2. Register IPC Handlers
// ==============================================================================
function registerIpcHandlers(sqlite: DatabaseType) {
  // DB Diagnostics
  ipcMain.handle('db:get-info', async () => {
    const sizeBytes = fs.statSync(sqlite.name).size;
    return {
      path: sqlite.name,
      version: sqlite.prepare('SELECT sqlite_version() as v').get() as { v: string },
      walMode: true,
      sizeBytes,
    };
  });

  // Query Grants with Filtering
  ipcMain.handle('grants:get-all', async (_, filters?: GrantFilters) => {
    let sql = `
      SELECT g.*, 
        COUNT(c.id) AS checklist_total,
        SUM(CASE WHEN c.status = 'Submitted' OR c.status = 'Ready' THEN 1 ELSE 0 END) AS checklist_completed
      FROM grants g
      LEFT JOIN document_checklist c ON g.id = c.grant_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.search) {
      sql += ` AND (g.program_title LIKE ? OR g.grantor_name LIKE ? OR g.assigned_lead LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }
    if (filters?.stage && filters.stage !== 'ALL') {
      sql += ` AND g.stage = ?`;
      params.push(filters.stage);
    }
    if (filters?.grantor && filters.grantor !== 'ALL') {
      sql += ` AND g.grantor_name = ?`;
      params.push(filters.grantor);
    }

    sql += ` GROUP BY g.id`;

    const sortBy = filters?.sortBy || 'submission_deadline';
    const sortOrder = filters?.sortOrder === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY g.${sortBy} ${sortOrder}`;

    const rows = sqlite.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
    }));
  });

  // Get single grant with checklist, compliance, and activity log
  ipcMain.handle('grants:get-by-id', async (_, id: string) => {
    const grant = sqlite.prepare('SELECT * FROM grants WHERE id = ?').get(id) as any;
    if (!grant) return null;

    const checklist = sqlite.prepare('SELECT * FROM document_checklist WHERE grant_id = ? ORDER BY category, title').all(id);
    const compliance_reports = sqlite.prepare('SELECT * FROM compliance_reports WHERE grant_id = ? ORDER BY due_date ASC').all(id);
    const activity_log = sqlite.prepare('SELECT * FROM grant_activity_log WHERE grant_id = ? ORDER BY timestamp DESC').all(id);

    return {
      ...grant,
      tags: grant.tags ? JSON.parse(grant.tags) : [],
      checklist,
      compliance_reports,
      activity_log,
    };
  });

  // Create Grant
  ipcMain.handle('grants:create', async (_, data: Omit<GrantEntity, 'id' | 'created_at' | 'updated_at'>, defaultChecklist?: string[]) => {
    const id = `g-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const insertTx = sqlite.transaction(() => {
      sqlite.prepare(`
        INSERT INTO grants (
          id, grantor_name, program_title, category, stage,
          requested_amount, awarded_amount, submission_deadline,
          decision_date, assigned_lead, lead_email, website_url, notes, tags
        ) VALUES (
          @id, @grantor_name, @program_title, @category, @stage,
          @requested_amount, @awarded_amount, @submission_deadline,
          @decision_date, @assigned_lead, @lead_email, @website_url, @notes, @tags
        )
      `).run({
        id,
        grantor_name: data.grantor_name,
        program_title: data.program_title,
        category: data.category || 'Government Agency',
        stage: data.stage || 'Prospecting',
        requested_amount: Number(data.requested_amount) || 0,
        awarded_amount: Number(data.awarded_amount) || 0,
        submission_deadline: data.submission_deadline,
        decision_date: data.decision_date || null,
        assigned_lead: data.assigned_lead,
        lead_email: data.lead_email || null,
        website_url: data.website_url || null,
        notes: data.notes || '',
        tags: JSON.stringify(data.tags || []),
      });

      // Default Document Checklist items
      const defaultDocs = defaultChecklist || [
        { title: 'Project Proposal & Executive Summary', category: 'Proposal' },
        { title: 'Itemized Project Budget & Financial Model', category: 'Budget' },
        { title: 'Audited Financial Statements (Last 2 Years)', category: 'Legal & Tax' },
        { title: 'Board Approval Resolution & Authorization', category: 'Governance' },
      ];

      for (const doc of defaultDocs) {
        sqlite.prepare(`
          INSERT INTO document_checklist (id, grant_id, title, category, status)
          VALUES (?, ?, ?, ?, 'Not Started')
        `).run(`chk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`, id, doc.title, doc.category);
      }

      // Log activity
      sqlite.prepare(`
        INSERT INTO grant_activity_log (id, grant_id, action_type, description, actor)
        VALUES (?, ?, 'GRANT_CREATED', 'Grant application initialized', ?)
      `).run(`act-${Date.now()}`, id, data.assigned_lead);
    });

    insertTx();
    return sqlite.prepare('SELECT * FROM grants WHERE id = ?').get(id);
  });

  // Update Grant
  ipcMain.handle('grants:update', async (_, id: string, data: Partial<GrantEntity>) => {
    const existing = sqlite.prepare('SELECT * FROM grants WHERE id = ?').get(id) as any;
    if (!existing) throw new Error('Grant not found');

    const fields: string[] = [];
    const params: any = { id };

    const updateableKeys = [
      'grantor_name', 'program_title', 'category', 'stage',
      'requested_amount', 'awarded_amount', 'submission_deadline',
      'decision_date', 'assigned_lead', 'lead_email', 'website_url', 'notes'
    ];

    for (const key of updateableKeys) {
      if (key in data) {
        fields.push(`${key} = @${key}`);
        params[key] = (data as any)[key];
      }
    }

    if ('tags' in data) {
      fields.push('tags = @tags');
      params.tags = JSON.stringify(data.tags || []);
    }

    if (fields.length > 0) {
      const sql = `UPDATE grants SET ${fields.join(', ')} WHERE id = @id`;
      sqlite.prepare(sql).run(params);

      if (data.stage && data.stage !== existing.stage) {
        sqlite.prepare(`
          INSERT INTO grant_activity_log (id, grant_id, action_type, description, actor)
          VALUES (?, ?, 'STAGE_CHANGE', ?, 'Current User')
        `).run(`act-${Date.now()}`, id, `Stage shifted from ${existing.stage} to ${data.stage}`);
      }
    }

    return sqlite.prepare('SELECT * FROM grants WHERE id = ?').get(id);
  });

  // Delete Grant
  ipcMain.handle('grants:delete', async (_, id: string) => {
    sqlite.prepare('DELETE FROM grants WHERE id = ?').run(id);
    return true;
  });

  // Compliance Reports
  ipcMain.handle('compliance:get-all', async (_, filter?: { status?: string }) => {
    let sql = `
      SELECT c.*, g.grantor_name, g.program_title
      FROM compliance_reports c
      JOIN grants g ON c.grant_id = g.id
    `;
    const params: any[] = [];
    if (filter?.status && filter.status !== 'ALL') {
      sql += ` WHERE c.status = ?`;
      params.push(filter.status);
    }
    sql += ` ORDER BY c.due_date ASC`;
    return sqlite.prepare(sql).all(...params);
  });

  ipcMain.handle('compliance:create', async (_, data: Omit<ComplianceReportEntity, 'id' | 'created_at'>) => {
    const id = `comp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    sqlite.prepare(`
      INSERT INTO compliance_reports (
        id, grant_id, report_type, period_covered, due_date, status, amount_accounted, reviewer, deliverables_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.grant_id,
      data.report_type,
      data.period_covered,
      data.due_date,
      data.status || 'Upcoming',
      Number(data.amount_accounted) || 0,
      data.reviewer || null,
      data.deliverables_summary || null
    );
    return sqlite.prepare('SELECT * FROM compliance_reports WHERE id = ?').get(id);
  });

  ipcMain.handle('compliance:update', async (_, id: string, data: Partial<ComplianceReportEntity>) => {
    const fields: string[] = [];
    const params: any = { id };
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'id' && k !== 'created_at' && k !== 'grantor_name' && k !== 'program_title') {
        fields.push(`${k} = @${k}`);
        params[k] = v;
      }
    }
    if (fields.length > 0) {
      sqlite.prepare(`UPDATE compliance_reports SET ${fields.join(', ')} WHERE id = @id`).run(params);
    }
    return sqlite.prepare('SELECT * FROM compliance_reports WHERE id = ?').get(id);
  });

  // Checklist Item Toggle
  ipcMain.handle('checklist:toggle-status', async (_, id: string, status: ChecklistStatus) => {
    sqlite.prepare('UPDATE document_checklist SET status = ? WHERE id = ?').run(status, id);
    return sqlite.prepare('SELECT * FROM document_checklist WHERE id = ?').get(id);
  });

  ipcMain.handle('checklist:add-item', async (_, grantId: string, title: string, category: DocumentCategory) => {
    const id = `chk-${Date.now().toString(36)}`;
    sqlite.prepare(`
      INSERT INTO document_checklist (id, grant_id, title, category, status)
      VALUES (?, ?, ?, ?, 'Not Started')
    `).run(id, grantId, title, category);
    return sqlite.prepare('SELECT * FROM document_checklist WHERE id = ?').get(id);
  });

  ipcMain.handle('checklist:delete-item', async (_, id: string) => {
    sqlite.prepare('DELETE FROM document_checklist WHERE id = ?').run(id);
    return true;
  });

  // Dashboard Aggregated Metrics
  ipcMain.handle('metrics:get-dashboard', async () => {
    const totalActiveRow = sqlite.prepare(`
      SELECT COUNT(*) as count FROM grants WHERE stage NOT IN ('Rejected')
    `).get() as { count: number };

    const stagesRows = sqlite.prepare(`
      SELECT stage, COUNT(*) as count FROM grants GROUP BY stage
    `).all() as Array<{ stage: GrantStage; count: number }>;

    const stageCounts: Record<GrantStage, number> = {
      Prospecting: 0,
      Drafting: 0,
      Submitted: 0,
      'Under Review': 0,
      Awarded: 0,
      Rejected: 0,
    };
    stagesRows.forEach((r) => {
      stageCounts[r.stage] = r.count;
    });

    const pendingRow = sqlite.prepare(`
      SELECT COUNT(*) as count, SUM(requested_amount) as amount
      FROM grants
      WHERE stage IN ('Drafting', 'Submitted', 'Under Review')
    `).get() as { count: number; amount: number | null };

    const awardedRow = sqlite.prepare(`
      SELECT SUM(awarded_amount) as total
      FROM grants
      WHERE stage = 'Awarded'
    `).get() as { total: number | null };

    // Deadlines within 30 days
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const submissionDeadlines = sqlite.prepare(`
      SELECT id, id as grantId, program_title as title, grantor_name as grantor, 'submission' as type,
             submission_deadline as dueDate, requested_amount as amount, stage as status
      FROM grants
      WHERE submission_deadline >= ? AND submission_deadline <= ? AND stage NOT IN ('Awarded', 'Rejected')
    `).all(today, thirtyDaysLater) as any[];

    const complianceDeadlines = sqlite.prepare(`
      SELECT c.id, c.grant_id as grantId, c.report_type as title, g.grantor_name as grantor, 'compliance' as type,
             c.due_date as dueDate, c.amount_accounted as amount, c.status as status
      FROM compliance_reports c
      JOIN grants g ON c.grant_id = g.id
      WHERE c.due_date >= ? AND c.due_date <= ? AND c.status NOT IN ('Approved', 'Submitted')
    `).all(today, thirtyDaysLater) as any[];

    const allDeadlines = [...submissionDeadlines, ...complianceDeadlines]
      .map((d) => {
        const diffMs = new Date(d.dueDate).getTime() - new Date(today).getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return { ...d, daysRemaining };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Category breakdown
    const categoryRows = sqlite.prepare(`
      SELECT category, SUM(awarded_amount) as awardedAmount, SUM(requested_amount) as requestedAmount, COUNT(*) as grantCount
      FROM grants
      GROUP BY category
    `).all() as any[];

    return {
      totalActiveGrants: totalActiveRow.count,
      stageCounts,
      pendingApplicationsCount: pendingRow.count || 0,
      pendingApplicationsAmount: pendingRow.amount || 0,
      totalAwardedFunding: awardedRow.total || 0,
      upcomingDeadlines30Days: allDeadlines.length,
      deadlinesList: allDeadlines,
      fundingByCategory: categoryRows,
    };
  });

  // Export to CSV with Native Save Dialog
  ipcMain.handle('export:grants-csv', async () => {
    const grants = sqlite.prepare(`
      SELECT id, grantor_name, program_title, category, stage,
             requested_amount, awarded_amount, submission_deadline,
             decision_date, assigned_lead, lead_email, notes
      FROM grants ORDER BY submission_deadline ASC
    `).all() as any[];

    const headers = [
      'Grant ID', 'Grantor', 'Program Title', 'Category', 'Stage',
      'Requested ($)', 'Awarded ($)', 'Submission Deadline',
      'Decision Date', 'Assigned Lead', 'Lead Email', 'Notes'
    ];

    const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;

    const lines = [
      headers.join(','),
      ...grants.map((g) => [
        escapeCsv(g.id),
        escapeCsv(g.grantor_name),
        escapeCsv(g.program_title),
        escapeCsv(g.category),
        escapeCsv(g.stage),
        g.requested_amount,
        g.awarded_amount,
        escapeCsv(g.submission_deadline),
        escapeCsv(g.decision_date),
        escapeCsv(g.assigned_lead),
        escapeCsv(g.lead_email),
        escapeCsv(g.notes)
      ].join(','))
    ];

    const csvContent = lines.join('\n');

    if (mainWindow) {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Grants to CSV',
        defaultPath: `GrantFlow_Export_${new Date().toISOString().split('T')[0]}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (!canceled && filePath) {
        fs.writeFileSync(filePath, csvContent, 'utf8');
        return { success: true, filePath, csvContent };
      }
    }

    return { success: true, csvContent };
  });

  // Raw SQL Execution for Local Developer/Admin Console
  ipcMain.handle('db:execute-raw-sql', async (_, query: string) => {
    const start = performance.now();
    const trimmed = query.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA');

    if (isSelect) {
      const stmt = sqlite.prepare(trimmed);
      const rows = stmt.all();
      const executionTimeMs = performance.now() - start;
      const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
      return { columns, rows, rowCount: rows.length, executionTimeMs };
    } else {
      const info = sqlite.prepare(trimmed).run();
      const executionTimeMs = performance.now() - start;
      return {
        columns: ['changes', 'lastInsertRowid'],
        rows: [{ changes: info.changes, lastInsertRowid: info.lastInsertRowid }],
        rowCount: info.changes,
        executionTimeMs,
      };
    }
  });

  // Reset to Sample Data
  ipcMain.handle('db:reset-sample-data', async () => {
    sqlite.exec(`
      DELETE FROM grant_activity_log;
      DELETE FROM compliance_reports;
      DELETE FROM document_checklist;
      DELETE FROM grants;
    `);
    seedInitialData(sqlite);
    return true;
  });
}

// ==============================================================================
// 3. Electron App Lifecycle
// ==============================================================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: 'GrantFlow Desktop',
    backgroundColor: '#171717',
    titleBarStyle: 'hiddenInset', // macOS integrated traffic lights
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  db = initDatabase();
  registerIpcHandlers(db);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    console.log('[SQLite] Checkpointing WAL and safely closing database...');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    db = null;
  }
});
