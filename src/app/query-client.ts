import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A failed request shows an error with a Retry button straight away.
        // A missing trace or a wrong response shape would not fix itself.
        retry: false,
      },
    },
  });
}
