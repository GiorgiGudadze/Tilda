import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { App } from '@/app/App';
import { worker } from '@/mocks/browser';

const root = createRoot(document.getElementById('root')!);

// The mock API must be ready before the first request, so wait for it.
worker.start({ onUnhandledFrame: 'bypass', quiet: true }).then(
  () => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  },
  () => {
    root.render(
      <main className="mx-auto max-w-6xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Trace Investigator</h1>
        <p>
          The demo could not start. Its data comes from a mock API that runs in
          a service worker, and this browser blocked it. Try a normal (not
          private) window, or another browser.
        </p>
      </main>,
    );
  },
);
