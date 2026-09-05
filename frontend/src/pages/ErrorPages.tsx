import { Link } from 'react-router-dom';

interface ErrorPageProps {
  code: number;
  title: string;
  message: string;
}

function ErrorPage({ code, title, message }: ErrorPageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full" />
        <p className="relative font-display font-black text-[150px] md:text-[200px] leading-none text-transparent bg-gradient-to-b from-brand-400/40 to-transparent bg-clip-text select-none">
          {code}
        </p>
      </div>
      <h1 className="font-display font-black text-3xl text-white mb-3 -mt-8">{title}</h1>
      <p className="text-gray-400 text-base mb-8 max-w-md">{message}</p>
      <div className="flex gap-3">
        <button onClick={() => window.history.back()} className="btn-secondary">
          ← Go Back
        </button>
        <Link to="/" className="btn-primary">
          Home
        </Link>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return <ErrorPage code={404} title="Page Not Found" message="The page you're looking for doesn't exist or has been moved." />;
}

export function UnauthorizedPage() {
  return <ErrorPage code={401} title="Unauthorized" message="You need to be signed in to access this page." />;
}

export function ForbiddenPage() {
  return <ErrorPage code={403} title="Access Denied" message="You don't have permission to access this resource." />;
}

export function ServerErrorPage() {
  return <ErrorPage code={500} title="Server Error" message="Something went wrong on our end. Please try again later." />;
}
