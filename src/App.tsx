import { useState, useEffect } from 'react';
import HomeView from './views/HomeView';
import RegisterView from './views/RegisterView';
import AdminView from './views/AdminView';
import RevealView from './views/RevealView';
import { AlertCircle, CheckCircle, Info, Flame } from 'lucide-react';

type ViewType = 'home' | 'register' | 'admin' | 'reveal';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function App() {
  const [view, setView] = useState<ViewType>('home');
  const [groupId, setGroupId] = useState<string>('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Custom Router Logic with pushState support
  const handleNavigate = (newView: string, newGroupId: string) => {
    setView(newView as ViewType);
    setGroupId(newGroupId);

    const url = new URL(window.location.href);
    url.searchParams.set('view', newView);
    if (newGroupId) {
      url.searchParams.set('groupId', newGroupId);
    } else {
      url.searchParams.delete('groupId');
    }
    // Retain name param if navigating to reveal, otherwise clean it
    if (newView !== 'reveal') {
      url.searchParams.delete('name');
    }
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = (params.get('view') || 'home') as ViewType;
      const gid = params.get('groupId') || '';
      setView(v);
      setGroupId(gid);
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState(); // initial parse on page load

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // Auto-hide toast notification
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const renderView = () => {
    switch (view) {
      case 'home':
        return <HomeView onNavigate={handleNavigate} showToast={showToast} />;
      case 'register':
        return <RegisterView groupId={groupId} onNavigate={handleNavigate} showToast={showToast} />;
      case 'admin':
        return <AdminView groupId={groupId} onNavigate={handleNavigate} showToast={showToast} />;
      case 'reveal':
        return <RevealView groupId={groupId} showToast={showToast} />;
      default:
        return <HomeView onNavigate={handleNavigate} showToast={showToast} />;
    }
  };

  // Icon switcher for Toast
  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-indigo-400 shrink-0" />;
    }
  };

  // Border class based on toast type
  const getToastBorderClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-950/80 border-emerald-500/20 text-emerald-100';
      case 'error':
        return 'bg-rose-950/80 border-rose-500/20 text-rose-100';
      case 'warning':
        return 'bg-amber-950/80 border-amber-500/20 text-amber-100';
      default:
        return 'bg-indigo-950/80 border-indigo-500/20 text-indigo-100';
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col justify-between relative">
      {/* Decorative stars */}
      <div className="absolute top-10 left-10 w-2 h-2 bg-amber-400 rounded-full animate-ping opacity-40"></div>
      <div className="absolute top-20 right-20 w-3 h-3 bg-purple-500 rounded-full animate-pulse opacity-30"></div>
      <div className="absolute bottom-40 left-20 w-2.5 h-2.5 bg-yellow-300 rounded-full animate-pulse opacity-40"></div>

      {/* Header border stripe */}
      <div className="w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-purple-600"></div>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12">
        {renderView()}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 text-center">
        <p className="text-[10px] text-slate-600 font-semibold tracking-wider uppercase flex items-center justify-center gap-1">
          <span>Made with</span>
          <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
          <span>for Manitto Maker · © {new Date().getFullYear()}</span>
        </p>
      </footer>

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 max-w-sm w-full animate-fade-up">
          <div
            className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-card-premium ${getToastBorderClass(
              toast.type
            )}`}
          >
            {getToastIcon(toast.type)}
            <div className="text-left text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
