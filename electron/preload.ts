/**
 * Electron Preload Script
 * File: electron/preload.ts
 *
 * Implements secure context isolation and safe IPC bridging.
 * Exposes window.electronAPI to the renderer without nodeIntegration.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  ElectronAPI,
  GrantFilters,
  GrantEntity,
  ChecklistStatus,
  DocumentCategory,
  ComplianceReportEntity,
  GrantStage
} from './types';

const electronAPI: ElectronAPI = {
  isElectron: true,

  getDbInfo: () => ipcRenderer.invoke('db:get-info'),

  getGrants: (filters?: GrantFilters) =>
    ipcRenderer.invoke('grants:get-all', filters),

  getGrantById: (id: string) =>
    ipcRenderer.invoke('grants:get-by-id', id),

  createGrant: (data: Omit<GrantEntity, 'id' | 'created_at' | 'updated_at'>, defaultChecklist?: string[]) =>
    ipcRenderer.invoke('grants:create', data, defaultChecklist),

  updateGrant: (id: string, data: Partial<GrantEntity>) =>
    ipcRenderer.invoke('grants:update', id, data),

  deleteGrant: (id: string) =>
    ipcRenderer.invoke('grants:delete', id),

  getComplianceReports: (filter?: { status?: string }) =>
    ipcRenderer.invoke('compliance:get-all', filter),

  createComplianceReport: (data: Omit<ComplianceReportEntity, 'id' | 'created_at'>) =>
    ipcRenderer.invoke('compliance:create', data),

  updateComplianceReport: (id: string, data: Partial<ComplianceReportEntity>) =>
    ipcRenderer.invoke('compliance:update', id, data),

  toggleChecklistItem: (id: string, status: ChecklistStatus) =>
    ipcRenderer.invoke('checklist:toggle-status', id, status),

  addChecklistItem: (grantId: string, title: string, category: DocumentCategory) =>
    ipcRenderer.invoke('checklist:add-item', grantId, title, category),

  deleteChecklistItem: (id: string) =>
    ipcRenderer.invoke('checklist:delete-item', id),

  getDashboardMetrics: () =>
    ipcRenderer.invoke('metrics:get-dashboard'),

  exportGrantsToCsv: () =>
    ipcRenderer.invoke('export:grants-csv'),

  executeRawSql: (query: string) =>
    ipcRenderer.invoke('db:execute-raw-sql', query),

  resetToSampleData: () =>
    ipcRenderer.invoke('db:reset-sample-data'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
