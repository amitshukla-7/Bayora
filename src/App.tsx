import { useState, useEffect } from 'react';
import type {
  PageId,
  DashboardSummary,
  Model,
  Policy,
  Dataset,
  Finding,
  SecurityEvent,
  PlatformSettings,
  UserProfile
} from './types';
import {
  fetchDashboardSummary,
  fetchModels,
  fetchPolicies,
  fetchDatasets,
  fetchFindings,
  fetchSecurityEvents,
  fetchSettings,
  resetDemoData,
  fetchCurrentUserApi,
  loginApi,
  logoutApi
} from './services/api';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandPalette } from './components/CommandPalette';
import { AuthModal } from './components/AuthModal';

import { DashboardPage } from './pages/DashboardPage';
import { RedTeamPage } from './pages/RedTeamPage';
import { ModelsPage } from './pages/ModelsPage';
import { SecurityPage } from './pages/SecurityPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { EvaluationResultsPage } from './pages/EvaluationResultsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const getInitialParam = (key: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback;
    const val = new URLSearchParams(window.location.search).get(key);
    return val || fallback;
  };

  const [activePage, setActivePage] = useState<PageId>(() => {
    return (getInitialParam('tab', 'dashboard') as PageId) || 'dashboard';
  });
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>(() => {
    return getInitialParam('evalId', '');
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(() => {
    return getInitialParam('category', 'All');
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Global Dialogs
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Main Data States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    timeout_seconds: 60,
    concurrency: 4,
    active_models: ['mod_llama32', 'mod_gpt4o'],
    active_policies: ['POL-001', 'POL-002', 'POL-003', 'POL-004', 'POL-005'],
    theme: 'system',
    log_level: 'info',
    default_dataset: 'ds_standard_safety_v1',
    streaming_enabled: true
  });
  const [isLoading, setIsLoading] = useState(true);

  // URL Query Parameters Synchronization (tab, evalId, category)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activePage);
      if (selectedEvaluationId) {
        url.searchParams.set('evalId', selectedEvaluationId);
      } else {
        url.searchParams.delete('evalId');
      }
      if (selectedCategoryFilter && selectedCategoryFilter !== 'All') {
        url.searchParams.set('category', selectedCategoryFilter);
      } else {
        url.searchParams.delete('category');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [activePage, selectedEvaluationId, selectedCategoryFilter]);

  const loadAllData = async () => {
    try {
      const [
        summaryRes,
        modelsRes,
        policiesRes,
        datasetsRes,
        findingsRes,
        eventsRes,
        settingsRes
      ] = await Promise.allSettled([
        fetchDashboardSummary(),
        fetchModels(),
        fetchPolicies(),
        fetchDatasets(),
        fetchFindings(),
        fetchSecurityEvents(),
        fetchSettings()
      ]);

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value);
      } else if (!summary) {
        setSummary({
          totalRuns: 0,
          passedRuns: 0,
          warningRuns: 0,
          failedRuns: 0,
          passRate: null,
          warningRate: null,
          failedRate: null,
          ribbonValid: true,
          syntheticDataMode: false,
          trends7d: [],
          securityOverview: [],
          benchmarkProfile: [],
          attackSuccess: []
        });
      }

      if (modelsRes.status === 'fulfilled') setModels(modelsRes.value.models || []);
      if (policiesRes.status === 'fulfilled') setPolicies(policiesRes.value.policies || []);
      if (datasetsRes.status === 'fulfilled') setDatasets(datasetsRes.value.datasets || []);
      if (findingsRes.status === 'fulfilled') setFindings(findingsRes.value.findings || []);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.events || []);
      if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value.settings);
    } catch (err) {
      console.error('Failed to load Bayora platform data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const initAuthAndData = async () => {
    try {
      const me = await fetchCurrentUserApi();
      if (me) {
        setCurrentUser(me);
      } else {
        // Automatic authentication for primary profile (amitshukla@1234 / amitshukla7)
        // Ensures immediate access to all existing data out of the box
        const loginRes = await loginApi('amitshukla@1234', 'amitshukla7').catch(() => null);
        if (loginRes?.user) {
          setCurrentUser(loginRes.user);
        }
      }
    } catch {
      // Continue gracefully
    } finally {
      await loadAllData();
    }
  };

  useEffect(() => {
    initAuthAndData();
  }, []);

  const handleResetDemo = async () => {
    if (window.confirm('Reset all Bayora data fixtures to initial baseline seed?')) {
      await resetDemoData();
      await loadAllData();
      setActivePage('dashboard');
    }
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
    await loadAllData();
  };

  const handleAuthSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    await loadAllData();
  };

  const handleNavigate = (page: PageId, extraId?: string) => {
    if (page === 'evaluations' && extraId) {
      if (extraId.startsWith('eval_')) {
        setSelectedEvaluationId(extraId);
      } else {
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
          currentUser={currentUser}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onSelectPage={(page) => setActivePage(page)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
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
                  datasets={datasets}
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
                  currentUser={currentUser}
                  onResetDemo={handleResetDemo}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  onLogout={handleLogout}
                  onProfileUpdate={(updated) => setCurrentUser(updated)}
                />
              )}

              {activePage === 'settings' && (
                <SettingsPage
                  settings={settings}
                  models={models}
                  datasets={datasets}
                  policies={policies}
                  onRefreshSettings={async () => {
                    const res = await fetchSettings();
                    setSettings(res.settings);
                  }}
                />
              )}
            </>
          )}
        </main>
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

      {/* Global Authentication Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
