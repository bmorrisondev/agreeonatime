import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * v1.0 data model (Linear DEV-381).
 * Enforce vote uniqueness (per timeslot + voter identity) in mutations — Convex compound
 * uniqueness for optional fields is handled in application logic.
 */
export default defineSchema({
  users: defineTable({
    /** Better Auth user id (string from auth session). */
    authUserId: v.string(),
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
    pushTokens: v.array(v.string()),
  })
    .index('by_auth_user', ['authUserId'])
    .index('by_email', ['email']),

  events: defineTable({
    ownerId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal('open'), v.literal('closed'), v.literal('decided')),
    deadline: v.number(),
    allowInviteeProposals: v.boolean(),
    decidedTimeslotId: v.optional(v.id('timeslots')),
    createdAt: v.number(),
    /** Cryptographically random, URL-safe — enforce uniqueness in create/update mutations. */
    shareToken: v.string(),
    /** Notification tracking — set by cron after sending (DEV-391). */
    deadlineReminderSent: v.optional(v.boolean()),
    deadlineReachedSent: v.optional(v.boolean()),
  })
    .index('by_share_token', ['shareToken'])
    .index('by_owner', ['ownerId']),

  timeslots: defineTable({
    eventId: v.id('events'),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    proposedBy: v.optional(v.id('users')),
    /** Display name when a guest (web) proposes a pending slot. */
    proposedByGuestName: v.optional(v.string()),
    /** Session id of the guest who proposed this slot (for rate-limiting). */
    proposedByGuestSessionId: v.optional(v.string()),
    approvalStatus: v.union(v.literal('approved'), v.literal('pending'), v.literal('rejected')),
    createdAt: v.number(),
  }).index('by_event', ['eventId']),

  votes: defineTable({
    eventId: v.id('events'),
    timeslotId: v.id('timeslots'),
    voterName: v.string(),
    voterUserId: v.optional(v.id('users')),
    voterSessionId: v.optional(v.string()),
    vote: v.union(v.literal('yes'), v.literal('no')),
    createdAt: v.number(),
  })
    .index('by_event', ['eventId'])
    .index('by_event_and_session', ['eventId', 'voterSessionId'])
    .index('by_timeslot', ['timeslotId'])
    .index('by_voter_user', ['voterUserId']),
});
