// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'deadline-sweep',
  { minutes: 15 },
  internal.notifications.deadlineSweep,
  {},
);

export default crons;
