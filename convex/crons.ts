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

crons.interval(
  'invitee-reminder-sweep',
  { minutes: 15 },
  internal.reminderEmails.inviteeReminderSweep,
  {},
);

export default crons;
