import { setupWorker } from 'msw/browser';
import { handlers } from '@/mocks/handlers';

/** The mock API. It runs in production too, because the app has no backend. */
export const worker = setupWorker(...handlers);
