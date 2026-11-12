import React, { useState, useEffect, useMemo } from 'react';
import type { GrantEntity, GrantStage, DashboardMetrics } from './types/grant';
import { dbService, subscribeToDatabase } from './services/db';
import { DesktopWindowChrome } from './components/DesktopWindowChrome';
import { DashboardView } from './components/DashboardView';
import { GrantPipelineView } from './components/GrantPipelineView';
import { ComplianceTrackerView } from './components/ComplianceTrackerView';
import { GrantDetailDrawer } from './components/GrantDetailDrawer';
import { NewGrantModal } from './components/NewGrantModal';
import { ArchitectureView } from './components/ArchitectureView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'pipeline' | 'compliance' | 'architecture'>('dashboard');
  const [grants, setGrants] = useState<GrantEntity[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Global Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<GrantStage | 'ALL'>('ALL');
  const [selectedGrantor, setSelectedGrantor] = useState<string | 'ALL'>('ALL');

  // Modals & Drawers
  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
  const [isNewGrantOpen, setIsNewGrantOpen] = useState<boolean>(false);
  const [newGrantInitialStage, setNewGrantInitialStage] = useState<GrantStage>('Prospecting');

  // Load all grants & dashboard metrics from local-first storage
  const refreshData = async () => {
    try {
      const [fetchedGrants, fetchedMetrics] = await Promise.all([
        dbService.getGrants({
          search: searchTerm,
          stage: selectedStage,
          grantor: selectedGrantor,
        }),
        dbService.getDashboardMetrics(),
      ]);
      setGrants(fetchedGrants);
      setMetrics(fetchedMetrics);
    } catch (err) {
      console.error('Error querying local SQLite database', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToDatabase(() => {
      refreshData();
    });
    return unsubscribe;
  }, [searchTerm, selectedStage, selectedGrantor]);

  // Unique list of grantors for the top bar filter
  const grantorList = useMemo(() => {
    const set = new Set<string>();
    grants.forEach((g) => {
      if (g.grantor_name) set.add(g.grantor_name);
    });
    return Array.from(set).sort();
  }, [grants]);

  // Handle stage transition
  const handleUpdateStage = async (grantId: string, newStage: GrantStage) => {
    try {
      await dbService.updateGrant(grantId, { stage: newStage });
      refreshData();
    } catch (err) {
      console.error('Failed to update grant stage', err);
    }
  };

  // Open modal with specific stage preset
  const handleOpenNewGrantWithStage = (stage: GrantStage) => {
    setNewGrantInitialStage(stage);
    setIsNewGrantOpen(true);
  };

  // CSV Export action
  const handleExportCsv = async () => {
    await dbService.exportGrantsToCsv();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 1. Desktop Window Frame & Top Action Bar */}
      <DesktopWindowChrome
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStage={selectedStage}
        onStageChange={setSelectedStage}
        selectedGrantor={selectedGrantor}
        onGrantorChange={setSelectedGrantor}
        grantorList={grantorList}
        onOpenNewGrantModal={() => {
          setNewGrantInitialStage('Prospecting');
          setIsNewGrantOpen(true);
        }}
        onExportCsv={handleExportCsv}
        isElectron={dbService.isElectron}
      />

      {/* 2. Main Desktop Viewport Canvas */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-6 overflow-x-hidden">
        {loading ? (
          <div className="py-20 text-center text-neutral-500">
            <div className="animate-pulse">Loading local-first database...</div>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                metrics={metrics}
                onNavigateToPipeline={(stage) => {
                  if (stage) setSelectedStage(stage);
                  setCurrentTab('pipeline');
                }}
                onNavigateToCompliance={() => setCurrentTab('compliance')}
                onSelectGrant={(id) => setSelectedGrantId(id)}
                onOpenNewGrantModal={() => {
                  setNewGrantInitialStage('Prospecting');
                  setIsNewGrantOpen(true);
                }}
              />
            )}

            {currentTab === 'pipeline' && (
              <GrantPipelineView
                grants={grants}
                onSelectGrant={(id) => setSelectedGrantId(id)}
                onUpdateStage={handleUpdateStage}
                onOpenNewGrantModalWithStage={handleOpenNewGrantWithStage}
              />
            )}

            {currentTab === 'compliance' && (
              <ComplianceTrackerView
                onSelectGrant={(id) => {
                  setSelectedGrantId(id);
                }}
              />
            )}

            {currentTab === 'architecture' && <ArchitectureView />}
          </>
        )}
      </main>

      {/* 3. Slide-in Grant Detail Drawer */}
      <GrantDetailDrawer
        grantId={selectedGrantId}
        onClose={() => setSelectedGrantId(null)}
        onGrantUpdated={() => {
          refreshData();
        }}
        onGrantDeleted={() => {
          setSelectedGrantId(null);
          refreshData();
        }}
        onOpenComplianceView={() => {
          setSelectedGrantId(null);
          setCurrentTab('compliance');
        }}
      />

      {/* 4. New Grant Application Modal */}
      <NewGrantModal
        isOpen={isNewGrantOpen}
        onClose={() => setIsNewGrantOpen(false)}
        initialStage={newGrantInitialStage}
        onGrantCreated={(newId) => {
          refreshData();
          setSelectedGrantId(newId);
        }}
      />
    </div>
  );
}
