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
        <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center p-4 text-center select-none">
          <div className="max-w-md w-full bg-[#0e1629] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,77,109,0.3)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display font-black text-lg sm:text-xl text-white">
                មានបញ្ហាបច្ចេកទេសបន្តិចបន្តួច
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                ទំព័រនេះត្រូវបាន Refresh ដោយស្វ័យប្រវត្តិកុំឱ្យអេក្រង់ខ្មៅ។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីដំណើរការឡើងវិញ៖
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> ផ្ទុកទំព័រឡើងវិញ (Reload)
              </button>

              <button
                onClick={this.handleGoHome}
                className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-white/10"
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
