import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Database,
  Code2,
  FileCode,
  Terminal,
  Play,
  RotateCcw,
  Check,
  Copy,
  Layers,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { dbService } from '../services/db';

export const ArchitectureView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'folder_structure' | 'schema' | 'electron_main' | 'electron_preload' | 'sqlite_console'>('folder_structure');
  const [copied, setCopied] = useState<string | null>(null);

  // SQLite Console state
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT id, grantor_name, program_title, stage, awarded_amount FROM grants WHERE stage = 'Awarded'");
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[]; rowCount: number; executionTimeMs: number } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [dbInfo, setDbInfo] = useState<{ path: string; version: string; walMode: boolean; sizeBytes: number } | null>(null);

  useEffect(() => {
    dbService.getDbInfo().then(setDbInfo);
    handleExecuteSql("SELECT id, grantor_name, program_title, stage, awarded_amount FROM grants WHERE stage = 'Awarded'");
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExecuteSql = async (queryToRun?: string) => {
    const q = queryToRun || sqlQuery;
    setIsExecuting(true);
    try {
      const res = await dbService.executeRawSql(q);
      setQueryResult(res);
    } catch (err: any) {
      setQueryResult({
        columns: ['error'],
        rows: [{ error: err.message || 'Execution error' }],
        rowCount: 0,
        executionTimeMs: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResetData = async () => {
    if (window.confirm('Reset database to default seed records?')) {
      await dbService.resetToSampleData();
      handleExecuteSql();
    }
  };

  const FOLDER_STRUCTURE_TEXT = `grantflow-desktop/
├── electron/                       # Desktop Native Process Architecture
│   ├── main.ts                    # Electron main: window creation, better-sqlite3 init, WAL mode, IPC handlers
│   ├── preload.ts                 # Context bridge: secure window.electronAPI exposure (contextIsolation: true)
│   └── types.ts                   # Shared TypeScript entity models, IPC channel constants, query filters
├── src/                            # React Desktop Frontend
│   ├── components/                
│   │   ├── DesktopWindowChrome.tsx# macOS/Windows native titlebar & top action bar (3-zone contract)
│   │   ├── DashboardView.tsx      # Main dashboard: 4 core KPI summary cards, pipeline distribution, deadlines
│   │   ├── GrantPipelineView.tsx  # Kanban Board & high-density desktop Table toggle view
│   │   ├── GrantDetailDrawer.tsx  # Slide-in drawer with fields, document checklist, post-award compliance
│   │   ├── ComplianceTrackerView.tsx # Dedicated view tracking post-award financial & narrative report dates
│   │   ├── NewGrantModal.tsx      # "+ New Grant" modal with auto-templated document checklists
│   │   └── ArchitectureView.tsx   # Folder structure visualizer, schema inspector & live SQLite console
│   ├── services/
│   │   └── db.ts                  # Local-first unified DB service (dual-mode: Electron IPC or Offline SQLite)
│   ├── utils/
│   │   └── formatters.ts          # Currency, tabular dates, deadline countdowns, stage badges
│   ├── types/
│   │   └── grant.ts               # Frontend grant entity interfaces and status contracts
│   ├── App.tsx                    # Root layout with responsive desktop viewport and reactive sync
│   ├── index.css                  # Tailwind v4 configuration, Plus Jakarta Sans, JetBrains Mono
│   └── main.tsx                   # React 19 entry point
├── schema.sql                     # Production SQLite schema: grants, checklists, compliance, audit log
├── package.json                   # Dependencies (better-sqlite3, electron, react, tailwindcss)
├── tsconfig.json                  # TypeScript compiler options
└── vite.config.ts                 # Vite desktop bundler configuration`;

  const SCHEMA_SQL_TEXT = `-- GrantFlow Desktop: Production SQLite Database Schema
-- File: schema.sql (Engine: SQLite 3.x via better-sqlite3)

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- 1. Table: grants (Primary grant application lifecycle)
CREATE TABLE IF NOT EXISTS grants (
    id TEXT PRIMARY KEY NOT NULL,
    grantor_name TEXT NOT NULL,
    program_title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Government Agency',
    stage TEXT NOT NULL CHECK(stage IN ('Prospecting', 'Drafting', 'Submitted', 'Under Review', 'Awarded', 'Rejected')),
    requested_amount REAL NOT NULL DEFAULT 0.0,
    awarded_amount REAL NOT NULL DEFAULT 0.0,
    submission_deadline TEXT NOT NULL, -- ISO-8601 'YYYY-MM-DD'
    decision_date TEXT,
    assigned_lead TEXT NOT NULL,
    lead_email TEXT,
    website_url TEXT,
    notes TEXT,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Table: document_checklist (Itemized requirements per application)
CREATE TABLE IF NOT EXISTS document_checklist (
    id TEXT PRIMARY KEY NOT NULL,
    grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Proposal',
    status TEXT NOT NULL CHECK(status IN ('Not Started', 'In Progress', 'Ready', 'Submitted')) DEFAULT 'Not Started',
    due_date TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size_bytes INTEGER DEFAULT 0,
    notes TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 3. Table: compliance_reports (Post-award financial and narrative report schedule)
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
    period_covered TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Upcoming', 'Due Soon', 'Submitted', 'Overdue', 'Approved')) DEFAULT 'Upcoming',
    amount_accounted REAL DEFAULT 0.0,
    filed_date TEXT,
    reviewer TEXT,
    deliverables_summary TEXT,
    document_url TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 4. Table: grant_activity_log (Audit trail)
CREATE TABLE IF NOT EXISTS grant_activity_log (
    id TEXT PRIMARY KEY NOT NULL,
    grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'Local User',
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- High-performance indices
CREATE INDEX IF NOT EXISTS idx_grants_stage ON grants(stage);
CREATE INDEX IF NOT EXISTS idx_grants_submission_deadline ON grants(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_checklist_grant_id ON document_checklist(grant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_grant_id ON compliance_reports(grant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_due_date ON compliance_reports(due_date);`;

  const ELECTRON_MAIN_EXCERPT = `// electron/main.ts - Excerpt of better-sqlite3 and IPC handlers
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'grantflow_local.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Apply schema.sql
  const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  db.exec(schema);
}

// IPC Handlers: Sub-millisecond synchronous execution via better-sqlite3
ipcMain.handle('grants:get-all', async (_, filters) => {
  const stmt = db.prepare('SELECT * FROM grants ORDER BY submission_deadline ASC');
  return stmt.all();
});

ipcMain.handle('export:grants-csv', async () => {
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  // Writes CSV directly to local filesystem
});`;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Desktop Software Architecture & SQLite Engine
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Architectural blueprints for Electron, TypeScript, local-first SQLite persistence, and IPC isolation.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>SQLite WAL Engine: Online</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveSection('folder_structure')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSection === 'folder_structure'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Folder Structure</span>
        </button>

        <button
          onClick={() => setActiveSection('schema')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSection === 'schema'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>schema.sql</span>
        </button>

        <button
          onClick={() => setActiveSection('electron_main')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSection === 'electron_main'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>electron/main.ts</span>
        </button>

        <button
          onClick={() => setActiveSection('electron_preload')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSection === 'electron_preload'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>electron/preload.ts</span>
        </button>

        <button
          onClick={() => setActiveSection('sqlite_console')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeSection === 'sqlite_console'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live SQLite Console</span>
        </button>
      </div>

      {/* 3. Section Content */}
      {activeSection === 'folder_structure' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Modular Desktop Project Architecture
            </h3>
            <button
              onClick={() => handleCopy(FOLDER_STRUCTURE_TEXT, 'folders')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded text-xs transition-colors"
            >
              {copied === 'folders' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'folders' ? 'Copied' : 'Copy Structure'}</span>
            </button>
          </div>
          <pre className="bg-neutral-950 p-4 rounded-md font-mono text-xs text-neutral-300 leading-relaxed overflow-x-auto border border-neutral-800">
            {FOLDER_STRUCTURE_TEXT}
          </pre>
        </div>
      )}

      {activeSection === 'schema' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                SQLite 3.x Production Schema (schema.sql)
              </h3>
              <p className="text-[11px] text-neutral-400">
                Relational schema with cascade deletions, WAL mode, indices, and updated_at triggers.
              </p>
            </div>
            <button
              onClick={() => handleCopy(SCHEMA_SQL_TEXT, 'schema')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded text-xs transition-colors"
            >
              {copied === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'schema' ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="bg-neutral-950 p-4 rounded-md font-mono text-xs text-emerald-300/90 leading-relaxed overflow-x-auto border border-neutral-800">
            {SCHEMA_SQL_TEXT}
          </pre>
        </div>
      )}

      {activeSection === 'electron_main' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Electron Main Process (electron/main.ts)
              </h3>
              <p className="text-[11px] text-neutral-400">
                Synchronous better-sqlite3 database operations with crash-proof WAL mode.
              </p>
            </div>
            <button
              onClick={() => handleCopy(ELECTRON_MAIN_EXCERPT, 'main')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded text-xs transition-colors"
            >
              {copied === 'main' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'main' ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="bg-neutral-950 p-4 rounded-md font-mono text-xs text-sky-300/90 leading-relaxed overflow-x-auto border border-neutral-800">
            {ELECTRON_MAIN_EXCERPT}
          </pre>
        </div>
      )}

      {activeSection === 'electron_preload' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Electron Preload Bridge (electron/preload.ts)
            </h3>
            <p className="text-[11px] text-neutral-400">
              Safe IPC contextBridge exposing strictly typed window.electronAPI without nodeIntegration.
            </p>
          </div>
          <pre className="bg-neutral-950 p-4 rounded-md font-mono text-xs text-amber-300/90 leading-relaxed overflow-x-auto border border-neutral-800">
{`// electron/preload.ts - Secure context isolation
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getGrants: (filters) => ipcRenderer.invoke('grants:get-all', filters),
  getGrantById: (id) => ipcRenderer.invoke('grants:get-by-id', id),
  createGrant: (data, checklist) => ipcRenderer.invoke('grants:create', data, checklist),
  updateGrant: (id, data) => ipcRenderer.invoke('grants:update', id, data),
  deleteGrant: (id) => ipcRenderer.invoke('grants:delete', id),
  getComplianceReports: (filter) => ipcRenderer.invoke('compliance:get-all', filter),
  toggleChecklistItem: (id, status) => ipcRenderer.invoke('checklist:toggle-status', id, status),
  getDashboardMetrics: () => ipcRenderer.invoke('metrics:get-dashboard'),
  exportGrantsToCsv: () => ipcRenderer.invoke('export:grants-csv'),
  executeRawSql: (query) => ipcRenderer.invoke('db:execute-raw-sql', query),
});`}
          </pre>
        </div>
      )}

      {activeSection === 'sqlite_console' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Live SQLite Query Runner & Database Inspector</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Execute SQL queries directly against the local storage engine.
              </p>
            </div>

            <button
              onClick={handleResetData}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sample Data</span>
            </button>
          </div>

          {/* Quick preset queries */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-neutral-500">Sample Queries:</span>
            <button
              onClick={() => {
                const q = "SELECT id, grantor_name, program_title, stage, awarded_amount FROM grants WHERE stage = 'Awarded'";
                setSqlQuery(q);
                handleExecuteSql(q);
              }}
              className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded font-mono"
            >
              Awarded Grants
            </button>
            <button
              onClick={() => {
                const q = "SELECT id, program_title, stage, requested_amount, submission_deadline FROM grants WHERE stage = 'Drafting'";
                setSqlQuery(q);
                handleExecuteSql(q);
              }}
              className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded font-mono"
            >
              Drafting Pipeline
            </button>
            <button
              onClick={() => {
                const q = "SELECT id, report_type, due_date, status, amount_accounted FROM compliance_reports";
                setSqlQuery(q);
                handleExecuteSql(q);
              }}
              className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded font-mono"
            >
              Compliance Reports
            </button>
            <button
              onClick={() => {
                const q = "SELECT id, title, category, status FROM document_checklist";
                setSqlQuery(q);
                handleExecuteSql(q);
              }}
              className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded font-mono"
            >
              Document Checklist
            </button>
          </div>

          {/* Query input area */}
          <div className="relative">
            <textarea
              rows={3}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="Enter SQLite query (e.g. SELECT * FROM grants)..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-neutral-700 resize-none"
            />
            <button
              onClick={() => handleExecuteSql()}
              disabled={isExecuting}
              className="absolute right-3 bottom-3 flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold rounded transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuting ? 'Running...' : 'Execute'}</span>
            </button>
          </div>

          {/* Query Results */}
          {queryResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span>Returned {queryResult.rowCount} rows</span>
                <span>Execution time: {queryResult.executionTimeMs}ms</span>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                      {queryResult.columns.map((col) => (
                        <th key={col} className="py-2 px-3 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/40">
                        {queryResult.columns.map((col) => (
                          <td key={col} className="py-1.5 px-3 text-neutral-300 whitespace-nowrap">
                            {typeof row[col] === 'object'
                              ? JSON.stringify(row[col])
                              : String(row[col] ?? 'NULL')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
