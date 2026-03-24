'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Client-side auth handler that processes hash fragments from Supabase.
 * When Supabase redirects after invite/magic link verification, the tokens
 * come in the URL hash (#access_token=...) which is only accessible client-side.
 */
export default function ConfirmarPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processando convite...');

  useEffect(() => {
    async function handleAuth() {
      const supabase = createClient();

      // onAuthStateChange will fire when Supabase processes the hash tokens
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe();
            // User is now signed in — redirect to set password
            router.push('/aceitar-convite');
          } else if (event === 'TOKEN_REFRESHED' && session) {
            subscription.unsubscribe();
            router.push('/aceitar-convite');
          }
        }
      );

      // Also check if already signed in (hash was already processed)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        subscription.unsubscribe();
        router.push('/aceitar-convite');
        return;
      }

      // If no session after 10 seconds, something went wrong
      setTimeout(() => {
        setStatus('Não foi possível processar o convite. Tente novamente ou entre em contato com o administrador.');
      }, 10000);
    }

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800/30 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg shadow-md p-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-4 animate-pulse">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-300">{status}</p>
        </div>
      </div>
    </div>
  );
}
