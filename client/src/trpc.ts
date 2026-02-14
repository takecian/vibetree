import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/api/router';

export const trpc = createTRPCReact<AppRouter>();
