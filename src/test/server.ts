import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

/** The same mock API as in the browser, running inside the test process. */
export const server = setupServer(...handlers);
