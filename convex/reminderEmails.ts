// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { internal } from './_generated/api';
import { internalAction, internalMutation, mutation } from './_generated/server';
import { authComponent } from './auth';
import { hasInviteeVoted } from './eventInvitees';
import {
  buildReminderUnsubscribeUrl,
  createReminderUnsubscribeToken,
} from './reminderUnsubscribe';
import { userHasPro, voterKey } from './subscriptionLimits';

const HOUR_MS = 60 * 60 * 1000;
const REMINDER_48H_MS = 48 * HOUR_MS;
const REMINDER_24H_MS = 24 * HOUR_MS;

type ReminderKind = '48h' | '24h';

function assertDevReminderTestEnabled(): void {
  const enabled = process.env.DEV_REMINDER_TEST_ENABLED?.trim().toLowerCase();
  if (enabled !== 'true' && enabled !== '1') {
    throw new ConvexError('Test reminder emails are disabled on this deployment.');
  }
}

function buildVoteUrl(shareToken: string): string {
  const site = process.env.SITE_URL?.split(',')[0]?.trim() ?? 'https://app.agreeonatime.com';
  return `${site}/vote/${encodeURIComponent(shareToken)}`;
}

function formatDeadlineUtc(deadlineMs: number): string {
  return new Date(deadlineMs).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function reminderSubject(eventTitle: string, kind: ReminderKind): string {
  if (kind === '24h') {
    return `Don't forget — vote on ${eventTitle} closes tomorrow`;
  }
  return `Don't forget — vote on ${eventTitle} closes in 2 days`;
}

function reminderLead(kind: ReminderKind): string {
  return kind === '24h' ? 'Voting closes tomorrow.' : 'Voting closes in about 2 days.';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function eventRemindersEnabled(event: Doc<'events'>): boolean {
  return event.remindersEnabled !== false;
}

function reminderAlreadySent(event: Doc<'events'>, kind: ReminderKind): boolean {
  if (kind === '48h') {
    return event.remindersSent?.h48 === true;
  }
  return event.remindersSent?.h24 === true;
}

function dueReminderKinds(event: Doc<'events'>, now: number): ReminderKind[] {
  const remaining = event.deadline - now;
  if (remaining <= 0) {
    return [];
  }
  const due: ReminderKind[] = [];
  if (remaining <= REMINDER_48H_MS && !reminderAlreadySent(event, '48h')) {
    due.push('48h');
  }
  if (remaining <= REMINDER_24H_MS && !reminderAlreadySent(event, '24h')) {
    due.push('24h');
  }
  return due;
}

/** Resend invitee vote reminder (DEV-435). */
export const sendInviteeReminderEmail = internalAction({
  args: {
    toEmail: v.string(),
    eventTitle: v.string(),
    deadline: v.number(),
    shareToken: v.string(),
    kind: v.union(v.literal('48h'), v.literal('24h')),
    inviteeName: v.optional(v.string()),
    eventId: v.optional(v.id('events')),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = args.toEmail.trim().toLowerCase();
    if (toEmail.length === 0) {
      return;
    }
    if (!apiKey) {
      console.warn(
        `[notify] Reminder (${args.kind}) for "${args.eventTitle}" — email to ${toEmail} (no RESEND_API_KEY)`,
      );
      return;
    }

    const voteUrl = buildVoteUrl(args.shareToken);
    const deadlineLabel = formatDeadlineUtc(args.deadline);
    const greeting = args.inviteeName != null && args.inviteeName.length > 0 ? args.inviteeName : 'there';
    const unsubscribeToken =
      args.eventId != null
        ? await createReminderUnsubscribeToken(toEmail, args.eventId)
        : null;
    const unsubscribeLine =
      unsubscribeToken != null
        ? `<p style="font-size:12px;color:#8884AA;margin-top:24px"><a href="${escapeHtml(buildReminderUnsubscribeUrl(unsubscribeToken))}" style="color:#8884AA">Unsubscribe from reminders for this event</a></p>`
        : '';

    const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: reminderSubject(args.eventTitle, args.kind),
        html: `<div style="font-family:system-ui,sans-serif;background:#1C1A2E;color:#FFFFFF;padding:24px;max-width:560px">
<p>Hi ${escapeHtml(greeting)},</p>
<p>${escapeHtml(reminderLead(args.kind))}</p>
<p><strong>${escapeHtml(args.eventTitle)}</strong></p>
<p>Deadline: ${escapeHtml(deadlineLabel)}</p>
<p>Your status: <strong>Not voted yet</strong></p>
<p><a href="${escapeHtml(voteUrl)}" style="display:inline-block;background:#FF6B5C;color:#FFFFFF;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Vote now</a></p>
${unsubscribeLine}
<p style="font-size:12px;color:#8884AA;margin-top:16px">Agree on a Time</p>
</div>`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[notify] Resend invitee reminder failed:', res.status, text);
    }
  },
});

/** Developer-only: send a sample invitee reminder to the signed-in user's email. */
export const sendTestReminderEmail = mutation({
  args: {
    kind: v.optional(v.union(v.literal('48h'), v.literal('24h'))),
  },
  handler: async (ctx, args) => {
    assertDevReminderTestEnabled();

    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (authUser == null) {
      throw new ConvexError('Sign in to send a test reminder.');
    }
    const toEmail = typeof authUser.email === 'string' ? authUser.email.trim() : '';
    if (toEmail.length === 0) {
      throw new ConvexError('Your account has no email address.');
    }

    const authId =
      typeof authUser.id === 'string'
        ? authUser.id
        : typeof authUser._id === 'string'
          ? authUser._id
          : null;
    if (authId == null) {
      throw new ConvexError('Account id missing.');
    }

    const appUser = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authId))
      .unique();

    const kind: ReminderKind = args.kind ?? '24h';
    let eventTitle = 'Dev reminder test';
    let deadline = Date.now() + REMINDER_24H_MS;
    let shareToken = 'dev-test';
    let eventId: Doc<'events'>['_id'] | undefined;

    if (appUser != null) {
      const ownedEvents = await ctx.db
        .query('events')
        .withIndex('by_owner', (q) => q.eq('ownerId', appUser._id))
        .order('desc')
        .take(1);
      const sample = ownedEvents[0];
      if (sample != null) {
        eventTitle = sample.title;
        deadline = sample.deadline;
        shareToken = sample.shareToken;
        eventId = sample._id;
      }
    }

    const inviteeName =
      typeof authUser.name === 'string' && authUser.name.length > 0 ? authUser.name : undefined;

    await ctx.scheduler.runAfter(0, internal.reminderEmails.sendInviteeReminderEmail, {
      toEmail,
      eventTitle,
      deadline,
      shareToken,
      kind,
      inviteeName,
      eventId,
    });

    return { toEmail, kind, eventTitle };
  },
});

export const markReminderSent = internalMutation({
  args: {
    eventId: v.id('events'),
    kind: v.union(v.literal('48h'), v.literal('24h')),
  },
  handler: async (ctx, { eventId, kind }) => {
    const event = await ctx.db.get(eventId);
    if (event == null) {
      return;
    }
    const prev = event.remindersSent ?? {};
    if (kind === '48h' && prev.h48 === true) {
      return;
    }
    if (kind === '24h' && prev.h24 === true) {
      return;
    }
    await ctx.db.patch(eventId, {
      remindersSent: {
        ...prev,
        [kind === '48h' ? 'h48' : 'h24']: true,
      },
    });
  },
});

export const processEventReminders = internalMutation({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, { eventId }) => {
    const now = Date.now();
    const event = await ctx.db.get(eventId);
    if (event == null || event.status !== 'open' || event.deadline <= now) {
      return;
    }
    if (!eventRemindersEnabled(event)) {
      return;
    }

    const owner = await ctx.db.get(event.ownerId);
    if (owner == null || !userHasPro(owner, now)) {
      return;
    }

    const kinds = dueReminderKinds(event, now);
    if (kinds.length === 0) {
      return;
    }

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .collect();
    const voterKeys = new Set(votes.map((row) => voterKey(row)));

    const invitees = await ctx.db
      .query('eventInvitees')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .collect();

    const unsubscribedEmails = new Set<string>();
    for (const invitee of invitees) {
      const email = invitee.email.trim().toLowerCase();
      const eventUnsub = await ctx.db
        .query('emailUnsubscribes')
        .withIndex('by_email_and_event', (q) => q.eq('email', email).eq('eventId', eventId))
        .unique();
      if (eventUnsub != null) {
        unsubscribedEmails.add(email);
      }
    }

    for (const kind of kinds) {
      let sentCount = 0;
      for (const invitee of invitees) {
        const email = invitee.email.trim().toLowerCase();
        if (unsubscribedEmails.has(email)) {
          continue;
        }
        if (hasInviteeVoted(invitee, voterKeys)) {
          continue;
        }
        sentCount += 1;
        await ctx.scheduler.runAfter(0, internal.reminderEmails.sendInviteeReminderEmail, {
          toEmail: email,
          eventTitle: event.title,
          deadline: event.deadline,
          shareToken: event.shareToken,
          kind,
          inviteeName: invitee.name,
          eventId,
        });
      }

      await ctx.db.patch(eventId, {
        remindersSent: {
          ...(event.remindersSent ?? {}),
          [kind === '48h' ? 'h48' : 'h24']: true,
        },
      });

      if (sentCount > 0 && owner.pushTokens.length > 0) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendExpoPush, {
          expoPushTokens: owner.pushTokens,
          title: 'Reminders sent',
          body: `Reminders sent to ${String(sentCount)} people who haven't voted on ${event.title}`,
          data: { eventId: String(eventId) },
        });
      }
    }
  },
});

/** Every 15 min: send 48h / 24h vote reminders for Agree+ events (DEV-435). */
export const inviteeReminderSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const horizon = now + REMINDER_48H_MS;

    const candidates = await ctx.db
      .query('events')
      .withIndex('by_status_and_deadline', (q) =>
        q.eq('status', 'open').gt('deadline', now).lte('deadline', horizon),
      )
      .collect();

    for (const event of candidates) {
      if (!eventRemindersEnabled(event)) {
        continue;
      }
      const kinds = dueReminderKinds(event, now);
      if (kinds.length === 0) {
        continue;
      }
      await ctx.scheduler.runAfter(0, internal.reminderEmails.processEventReminders, {
        eventId: event._id,
      });
    }
  },
});

export const recordEmailUnsubscribe = internalMutation({
  args: {
    email: v.string(),
    eventId: v.id('events'),
  },
  handler: async (ctx, { email, eventId }) => {
    const normalized = email.trim().toLowerCase();
    if (normalized.length === 0) {
      return;
    }
    const existing = await ctx.db
      .query('emailUnsubscribes')
      .withIndex('by_email_and_event', (q) => q.eq('email', normalized).eq('eventId', eventId))
      .unique();
    if (existing != null) {
      return;
    }
    await ctx.db.insert('emailUnsubscribes', {
      email: normalized,
      eventId,
      createdAt: Date.now(),
    });
  },
});
