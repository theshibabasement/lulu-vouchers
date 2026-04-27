import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center text-ink-soft">
          Carregando…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
