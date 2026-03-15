'use client';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">Erro ao carregar página</h2>
        <p className="text-gray-400 mb-6">
          Ocorreu um erro ao carregar esta seção. Tente novamente ou volte ao dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="bg-green-700 text-white px-6 py-2 rounded-md hover:bg-green-800 font-medium"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="border border-green-700/40 text-gray-300 px-6 py-2 rounded-md hover:bg-green-900/30 font-medium"
          >
            Ir ao Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
