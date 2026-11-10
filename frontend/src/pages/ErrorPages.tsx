import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

interface ErrorPageProps {
  code: number;
  title: string;
  message: string;
}

function ErrorPage({ code, title, message }: ErrorPageProps) {
  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center bg-slate-50/50">
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-[32px] p-8 sm:p-12 max-w-md w-full shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <p className="font-display font-black text-7xl sm:text-8xl leading-none text-blue-600/15 select-none mb-2">
          {code}
        </p>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-sm mb-7 leading-relaxed">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-sm shadow-blue-600/20 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return <ErrorPage code={404} title="Page Not Found" message="The page you're looking for doesn't exist or has been moved." />;
}

export function UnauthorizedPage() {
  return <ErrorPage code={401} title="Sign In Required" message="Please sign in to your account to access this content." />;
}

export function ForbiddenPage() {
  return <ErrorPage code={403} title="Access Denied" message="You don't have permission to access this resource." />;
}

export function ServerErrorPage() {
  return <ErrorPage code={500} title="Server Error" message="Something went wrong on our end. Please try again later." />;
}
