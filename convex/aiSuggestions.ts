// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalQuery } from './_generated/server';
import { authComponent } from './auth';
import { roundTimeMs } from './timeRounding';
import { userHasPro } from './subscriptionLimits';
import { betterAuthUserIdString } from './users';

const MIN_DECIDED_EVENTS = 3;
const MAX_HISTORY_EVENTS = 10;
const MIN_SUGGESTIONS = 2;
const MAX_SUGGESTIONS = 3;

const suggestionValidator = v.object({
  startTimeMs: v.number(),
  rationale: v.string(),
});

export const getSuggestedTimeslotsResultValidator = v.union(
  v.object({
    status: v.literal('success'),
    suggestions: v.array(suggestionValidator),
  }),
  v.object({
    status: v.literal('insufficient_history'),
    message: v.string(),
    decidedCount: v.number(),
  }),
  v.object({
    status: v.literal('error'),
    message: v.string(),
  }),
);

type DecidedHistoryRow = {
  title: string;
  startTimeMs: number;
  endTimeMs: number | null;
  schedulingMode: 'discrete' | 'range';
};

type SuggestionContext = {
  ownerId: string;
  isPro: boolean;
  history: DecidedHistoryRow[];
};

export const loadSuggestionContext = internalQuery({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }): Promise<SuggestionContext | null> => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUserId))
      .unique();
    if (user == null) {
      return null;
    }

    const owned = await ctx.db
      .query('events')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .collect();

    const history: DecidedHistoryRow[] = [];
    for (const event of owned) {
      if (event.status !== 'decided' || event.decidedTimeslotId == null) {
        continue;
      }
      const slot = await ctx.db.get(event.decidedTimeslotId);
      if (slot == null) {
        continue;
      }
      history.push({
        title: event.title,
        startTimeMs: slot.startTime,
        endTimeMs: slot.endTime ?? null,
        schedulingMode: event.schedulingMode === 'range' ? 'range' : 'discrete',
      });
    }

    history.sort((a, b) => b.startTimeMs - a.startTimeMs);

    return {
      ownerId: user._id,
      isPro: userHasPro(user),
      history: history.slice(0, MAX_HISTORY_EVENTS),
    };
  },
});

function formatUtc(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function buildClaudePrompt(params: {
  history: DecidedHistoryRow[];
  deadlineMs?: number;
  existingSlotMs: number[];
  nowMs: number;
}): string {
  const historyLines =
    params.history.length === 0
      ? 'No prior decided events.'
      : params.history
          .map(
            (row, index) =>
              `${index + 1}. "${row.title}" — ${formatUtc(row.startTimeMs)}${
                row.endTimeMs != null ? ` to ${formatUtc(row.endTimeMs)}` : ''
              } (${row.schedulingMode})`,
          )
          .join('\n');

  const existingLines =
    params.existingSlotMs.length === 0
      ? 'None yet.'
      : params.existingSlotMs.map((ms) => `- ${formatUtc(ms)}`).join('\n');

  const deadlineLine =
    params.deadlineMs != null
      ? `Voting deadline (UTC): ${formatUtc(params.deadlineMs)} — every suggestion must start AFTER this time.`
      : 'No voting deadline provided yet — suggest times at least 48 hours from now.';

  return `You help event organizers pick good proposed meeting times based on their past scheduling patterns.

Past decided events (most recent first, UTC):
${historyLines}

Already proposed for the new event (UTC):
${existingLines}

${deadlineLine}

Current time (UTC): ${formatUtc(params.nowMs)}

Return JSON only (no markdown) with this shape:
{"suggestions":[{"startTimeMs":<number>,"rationale":"<short reason>"}]}

Rules:
- Suggest ${MIN_SUGGESTIONS} to ${MAX_SUGGESTIONS} distinct future times.
- startTimeMs must be Unix epoch milliseconds, rounded to 15-minute boundaries.
- Do not repeat times already proposed (within 30 minutes).
- Base suggestions on day-of-week and time-of-day patterns in the history.
- rationale: one concise sentence per suggestion (max 120 chars).
- All times must be strictly in the future relative to current time.`;
}

type ClaudeSuggestionPayload = {
  suggestions?: Array<{ startTimeMs?: number; rationale?: string }>;
};

function parseClaudeSuggestions(text: string): ClaudeSuggestionPayload {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error('Model response was not JSON');
  }
  return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as ClaudeSuggestionPayload;
}

function normalizeSuggestions(
  raw: ClaudeSuggestionPayload,
  params: { nowMs: number; deadlineMs?: number; existingSlotMs: number[] },
): Array<{ startTimeMs: number; rationale: string }> {
  const existing = new Set(params.existingSlotMs.map((ms) => roundTimeMs(ms)));
  const seen = new Set<number>();
  const out: Array<{ startTimeMs: number; rationale: string }> = [];

  for (const row of raw.suggestions ?? []) {
    if (typeof row.startTimeMs !== 'number' || !Number.isFinite(row.startTimeMs)) {
      continue;
    }
    const startTimeMs = roundTimeMs(row.startTimeMs);
    if (startTimeMs <= params.nowMs) {
      continue;
    }
    if (params.deadlineMs != null && startTimeMs <= params.deadlineMs) {
      continue;
    }
    if (existing.has(startTimeMs) || seen.has(startTimeMs)) {
      continue;
    }
    const rationale = typeof row.rationale === 'string' ? row.rationale.trim() : '';
    if (rationale.length === 0) {
      continue;
    }
    seen.add(startTimeMs);
    out.push({ startTimeMs, rationale: rationale.slice(0, 160) });
    if (out.length >= MAX_SUGGESTIONS) {
      break;
    }
  }

  return out;
}

async function callClaudeForSuggestions(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (apiKey == null || apiKey.length === 0) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[aiSuggestions] Claude API error', res.status, text);
    throw new Error('Could not generate suggestions');
  }

  const body = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = body.content?.find((block) => block.type === 'text')?.text;
  if (text == null || text.length === 0) {
    throw new Error('Empty model response');
  }
  return text;
}

/** Agree+ — suggest discrete timeslots from the owner's decided-event history (DEV-441). */
export const getSuggestedTimeslots = action({
  args: {
    deadlineMs: v.optional(v.number()),
    existingSlotMs: v.optional(v.array(v.number())),
  },
  returns: getSuggestedTimeslotsResultValidator,
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to use AI suggestions');
    }
    const authUserId = betterAuthUserIdString(authUser);
    if (authUserId == null) {
      throw new ConvexError('Account id missing — try signing in again.');
    }

    const context: SuggestionContext | null = await ctx.runQuery(internal.aiSuggestions.loadSuggestionContext, {
      authUserId,
    });
    if (context == null) {
      throw new ConvexError('Account not found — try signing in again.');
    }
    if (!context.isPro) {
      throw new ConvexError('AI suggestions are an Agree+ feature. Subscribe to unlock.');
    }

    const decidedCount = context.history.length;
    if (decidedCount < MIN_DECIDED_EVENTS) {
      return {
        status: 'insufficient_history' as const,
        message: `Schedule and decide at least ${MIN_DECIDED_EVENTS} events first — we'll learn your timing patterns from there.`,
        decidedCount,
      };
    }

    const nowMs = Date.now();
    const existingSlotMs = (args.existingSlotMs ?? []).map((ms) => roundTimeMs(ms));
    const deadlineMs =
      args.deadlineMs != null && Number.isFinite(args.deadlineMs)
        ? roundTimeMs(args.deadlineMs)
        : undefined;

    try {
      const prompt = buildClaudePrompt({
        history: context.history,
        deadlineMs,
        existingSlotMs,
        nowMs,
      });
      const modelText = await callClaudeForSuggestions(prompt);
      const parsed = parseClaudeSuggestions(modelText);
      const suggestions = normalizeSuggestions(parsed, { nowMs, deadlineMs, existingSlotMs });

      if (suggestions.length < MIN_SUGGESTIONS) {
        return {
          status: 'error' as const,
          message: 'Could not find enough suitable times. Try adjusting your deadline or add times manually.',
        };
      }

      return { status: 'success' as const, suggestions };
    } catch (error: unknown) {
      console.error('[aiSuggestions] getSuggestedTimeslots failed', error);
      return {
        status: 'error' as const,
        message: 'AI suggestions are temporarily unavailable. Try again in a moment.',
      };
    }
  },
});
