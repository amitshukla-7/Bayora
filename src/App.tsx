import { useState, useEffect } from 'react';
import type {
  PageId,
  DashboardSummary,
  Model,
  Policy,
  Dataset,
  Finding,
  SecurityEvent
} from './types';
import {
  fetchDashboardSummary,
  fetchModels,
  fetchPolicies,
  fetchDatasets,
  fetchFindings,
  fetchSecurityEvents,
  resetDemoData
} from './services/api';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandPalette } from './components/CommandPalette';
import { AssistantDrawer } from './components/AssistantDrawer';

import { DashboardPage } from './pages/DashboardPage';
import { RedTeamPage } from './pages/RedTeamPage';
import { ModelsPage } from './pages/ModelsPage';
import { SecurityPage } from './pages/SecurityPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { EvaluationResultsPage } from './pages/EvaluationResultsPage';
import { ProfilePage } from './pages/ProfilePage';
import { PricingPage } from './pages/PricingPage';

import { Bot } from 'lucide-react';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Global Dialogs
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Main Data States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = async () => {
    try {
      const [
        summaryData,
        modelsData,
        policiesData,
        datasetsData,
        findingsData,
        eventsData
      ] = await Promise.all([
        fetchDashboardSummary(),
        fetchModels(),
        fetchPolicies(),
        fetchDatasets(),
        fetchFindings(),
        fetchSecurityEvents()
      ]);

      setSummary(summaryData);
      setModels(modelsData.models || []);
      setPolicies(policiesData.policies || []);
      setDatasets(datasetsData.datasets || []);
      setFindings(findingsData.findings || []);
      setEvents(eventsData.events || []);
    } catch (err) {
      console.error('Failed to load Bayora platform data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleResetDemo = async () => {
    if (window.confirm('Reset all Bayora data fixtures to initial baseline seed?')) {
      await resetDemoData();
      await loadAllData();
      setActivePage('dashboard');
    }
  };

  const handleNavigate = (page: PageId, extraId?: string) => {
    if (page === 'evaluations' && extraId) {
      // If extraId is an evaluation ID
      if (extraId.startsWith('eval_')) {
        setSelectedEvaluationId(extraId);
      } else {
        // It's a category filter from the Attack Success chart
        setSelectedCategoryFilter(extraId);
      }
    }
    setActivePage(page);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden selection:bg-[#9B7DE8]/30 selection:text-slate-900">
      {/* Left Persistent Navigation Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={(page) => setActivePage(page)}
        onResetDemo={handleResetDemo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopBar
          activePage={activePage}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenAssistant={() => setIsAssistantOpen(true)}
          onSelectPage={(page) => setActivePage(page)}
        />

        {/* Dynamic Page Router */}
        <main className="flex-1 overflow-y-auto">
          {isLoading || !summary ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 gap-3">
              <div className="w-7 h-7 border-2 border-[#9B7DE8] border-t-transparent rounded-full animate-spin" />
              <span>Loading Bayora Intelligence Center...</span>
            </div>
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardPage
                  summary={summary}
                  onNavigate={handleNavigate}
                  onOpenUploadModel={() => {
                    setIsUploadModalOpen(true);
                    setActivePage('models');
                  }}
                />
              )}

              {activePage === 'redteam' && (
                <RedTeamPage
                  models={models}
                  onNavigate={handleNavigate}
                  onRefreshData={loadAllData}
                  onOpenUploadModel={() => {
                    setIsUploadModalOpen(true);
                    setActivePage('models');
                  }}
                />
              )}

              {activePage === 'models' && (
                <ModelsPage
                  models={models}
                  onNavigate={handleNavigate}
                  onRefreshData={loadAllData}
                  isAddModalOpen={isUploadModalOpen}
                  onCloseAddModal={() => setIsUploadModalOpen(false)}
                />
              )}

              {activePage === 'security' && (
                <SecurityPage
                  policies={policies}
                  events={events}
                  onRefreshData={loadAllData}
                  onNavigate={handleNavigate}
                />
              )}

              {activePage === 'datasets' && (
                <DatasetsPage
                  datasets={datasets}
                  onNavigate={handleNavigate}
                  onRefreshData={loadAllData}
                />
              )}

              {activePage === 'evaluations' && (
                <EvaluationResultsPage
                  initialEvaluationId={selectedEvaluationId}
                  categoryFilter={selectedCategoryFilter}
                  onNavigate={handleNavigate}
                />
              )}

              {activePage === 'profile' && (
                <ProfilePage
                  onNavigate={handleNavigate}
                  onResetDemo={handleResetDemo}
                />
              )}

              {activePage === 'pricing' && (
                <PricingPage onNavigate={handleNavigate} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Bottom-Right Assistant Help Pill */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#9B7DE8] to-[#8762e0] text-white text-xs font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>Security Assistant</span>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </button>
      </div>

      {/* Global Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        models={models}
        policies={policies}
        findings={findings}
        datasets={datasets}
      />

      {/* Grounded AI Assistant Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        evaluationId={selectedEvaluationId}
      />
    </div>
  );
}

export default App;
