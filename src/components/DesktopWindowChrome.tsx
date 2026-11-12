import React from 'react';
import {
  Download,
  Plus,
  Search,
  Database,
  Filter,
  Layers,
  BarChart3,
  FileCheck2,
  Code2,
  HardDrive
} from 'lucide-react';
import type { GrantStage } from '../types/grant';

interface DesktopWindowChromeProps {
  currentTab: 'dashboard' | 'pipeline' | 'compliance' | 'architecture';
  onTabChange: (tab: 'dashboard' | 'pipeline' | 'compliance' | 'architecture') => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStage: GrantStage | 'ALL';
  onStageChange: (stage: GrantStage | 'ALL') => void;
  selectedGrantor: string | 'ALL';
  onGrantorChange: (grantor: string | 'ALL') => void;
  grantorList: string[];
  onOpenNewGrantModal: () => void;
  onExportCsv: () => void;
  isElectron: boolean;
}

export const DesktopWindowChrome: React.FC<DesktopWindowChromeProps> = ({
  currentTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  selectedStage,
  onStageChange,
  selectedGrantor,
  onGrantorChange,
  grantorList,
  onOpenNewGrantModal,
  onExportCsv,
  isElectron,
}) => {
  return (
    <div className="shrink-0 bg-neutral-950 border-b border-neutral-800 text-neutral-200">
      {/* 1. Desktop Window Frame Header (Mac/PC Titlebar) */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-950/80 border-b border-neutral-800/80 select-none text-xs">
        <div className="flex items-center gap-3">
          {/* Window traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors inline-block" />
          </div>
          <span className="text-neutral-500 text-xs">|</span>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-neutral-300 font-medium tracking-tight">GrantFlow Desktop</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400 text-[11px] font-mono">
              {isElectron ? 'Electron Runtime' : 'Local-First SQLite Engine (Offline)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
          <span className="font-mono text-emerald-400/90">WAL Mode Active</span>
          <span className="text-neutral-600">·</span>
          <span>Zero Cloud Dependency</span>
        </div>
      </div>

      {/* 2. Top Navigation Bar - Strict 3-Zone Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-neutral-800">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <span className="text-base font-semibold tracking-tight text-white">
            GrantFlow
          </span>
          <span className="text-xs text-neutral-400 font-normal">
            Enterprise Local
          </span>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'dashboard'
                ? 'bg-neutral-800 text-white font-medium shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onTabChange('pipeline')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'pipeline'
                ? 'bg-neutral-800 text-white font-medium shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Grant Pipeline</span>
          </button>

          <button
            onClick={() => onTabChange('compliance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'compliance'
                ? 'bg-neutral-800 text-white font-medium shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Compliance Tracker</span>
          </button>

          <button
            onClick={() => onTabChange('architecture')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'architecture'
                ? 'bg-neutral-800 text-white font-medium shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Architecture & SQLite</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenNewGrantModal}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-neutral-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 shadow-xs active:translate-y-px"
          >
            <Plus className="w-4 h-4" />
            <span>New Grant</span>
          </button>
        </div>
      </header>

      {/* 3. Contextual Action & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-neutral-900/60 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search programs, grantors, leads, or keywords..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-neutral-500 text-xs">Stage:</span>
            <select
              value={selectedStage}
              onChange={(e) => onStageChange(e.target.value as any)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-neutral-700 cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              <option value="Prospecting">Prospecting</option>
              <option value="Drafting">Drafting</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Awarded">Awarded</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Grantor Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-neutral-500 text-xs">Grantor:</span>
            <select
              value={selectedGrantor}
              onChange={(e) => onGrantorChange(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-neutral-700 cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">All Grantors</option>
              {grantorList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Secondary Actions: Export CSV */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-300 rounded-md transition-colors text-xs"
            title="Export full grant database to CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
