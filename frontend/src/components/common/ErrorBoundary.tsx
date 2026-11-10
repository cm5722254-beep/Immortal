import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center select-none">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-[28px] p-6 sm:p-8 space-y-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display font-black text-lg sm:text-xl text-slate-900">
                មានបញ្ហាបច្ចេកទេសបន្តិចបន្តួច
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                ទំព័រនេះត្រូវការផ្ទុកឡើងវិញ។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីដំណើរការបន្ត៖
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> ផ្ទុកទំព័រឡើងវិញ (Reload)
              </button>

              <button
                onClick={this.handleGoHome}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-200"
              >
                <Home className="w-4 h-4" /> ទំព័រដើម
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
