import { z } from "zod";
import type { StreamingAiClient } from "./ai";

export type ResponseLength = "brief" | "standard" | "extended";
export type DescriptionLevel = "none" | "light" | "immersive";
export type Initiative = "user" | "shared" | "character";

export type StoryBeat = {
  objective: string;
  obstacle: string;
  stakes: string;
  progress: number;
  status: "active" | "resolved" | "abandoned";
  introducedTurn: number;
};

export type StoryState = {
  turnCount: number;
  phase: string;
  tension: number;
  momentum: number;
  trust: number;
  affinity: number;
  conflict: number;
  currentLocation: string | null;
  currentTime: string | null;
  openThreads: string[];
  establishedFacts: string[];
  lastTransitionTurn: number;
  calmTurns: number;
  version: number;
  currentBeat?: StoryBeat;
  recentResponseLengths?: ResponseLength[];
  recentDescriptionLevels?: DescriptionLevel[];
  leadOwner?: Initiative;
};

export type ResponsePlan = {
  length: ResponseLength;
  targetWords: number;
  description: DescriptionLevel;
  initiative: Initiative;
  focus: "dialogue" | "action" | "emotion" | "plot" | "balanced";
  characterMove:
    | "respond"
    | "challenge"
    | "disagree"
    | "refuse"
    | "propose"
    | "act"
    | "reveal"
    | "reframe"
    | "support";
  ending: "statement" | "action" | "offer" | "question" | "unresolved";
};

const defaultResponsePlan: ResponsePlan = {
  length: "standard",
  targetWords: 120,
  description: "light",
  initiative: "shared",
  focus: "balanced",
  characterMove: "respond",
  ending: "statement",
};

const storyBeatSchema = z.object({
  objective: z.string().min(1).max(500),
  obstacle: z.string().min(1).max(500),
  stakes: z.string().min(1).max(500),
  progress: z.number().int().min(0).max(100),
  status: z.enum(["active", "resolved", "abandoned"]),
  introducedTurn: z.number().int().min(0),
});

const responsePlanSchema = z.object({
  length: z.enum(["brief", "standard", "extended"]),
  targetWords: z.number().int().min(30).max(320),
  description: z.enum(["none", "light", "immersive"]),
  initiative: z.enum(["user", "shared", "character"]),
  focus: z.enum(["dialogue", "action", "emotion", "plot", "balanced"]),
  characterMove: z.enum([
    "respond",
    "challenge",
    "disagree",
    "refuse",
    "propose",
    "act",
    "reveal",
    "reframe",
    "support",
  ]),
  ending: z.enum(["statement", "action", "offer", "question", "unresolved"]),
});

const analysisSchema = z.object({
  proposedMode: z.enum(["hold", "develop", "transition"]),
  confidence: z.number().min(0).max(1),
  explicitTransitionRequest: z.boolean().default(false),
  calmInteraction: z.boolean().default(false),
  reason: z.string().max(500),
  signals: z
    .array(
      z.object({
        type: z.enum([
          "explicit_change",
          "commitment",
          "conflict",
          "revelation",
          "emotional_shift",
          "goal_progress",
        ]),
        evidence: z.string().max(300),
        weight: z.number().int().min(0).max(40),
      }),
    )
    .max(8),
  delta: z.object({
    tension: z.number().int().min(-10).max(10).default(0),
    trust: z.number().int().min(-5).max(5).default(0),
    affinity: z.number().int().min(-5).max(5).default(0),
    conflict: z.number().int().min(-5).max(5).default(0),
    newPhase: z.string().max(80).nullable().default(null),
    newLocation: z.string().max(300).nullable().default(null),
    newTime: z.string().max(300).nullable().default(null),
    addThreads: z.array(z.string().max(300)).max(4).default([]),
    resolveThreads: z.array(z.string().max(300)).max(4).default([]),
    addFacts: z.array(z.string().max(300)).max(4).default([]),
    beatProgress: z.number().int().min(-20).max(40).default(0),
    resolveCurrentBeat: z.boolean().default(false),
    nextBeat: storyBeatSchema
      .omit({ progress: true, status: true, introducedTurn: true })
      .nullable()
      .default(null),
  }),
  responsePlan: responsePlanSchema.default(defaultResponsePlan),
  responseGuidance: z.string().max(1000),
});

export type StoryAnalysis = z.infer<typeof analysisSchema>;
export type StoryDirection = {
  decision: "hold" | "develop" | "transition";
  confidence: number;
  reason: string;
  signals: StoryAnalysis["signals"];
  guidance: string;
  responsePlan: ResponsePlan;
  softNudge: boolean;
  before: StoryState;
  after: StoryState;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const unique = (items: string[], max: number) =>
  [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(-max);
const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

function threadMatches(thread: string, resolution: string) {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  const left = normalize(thread);
  const right = normalize(resolution);
  return (
    left === right ||
    (Math.min(left.length, right.length) >= 12 &&
      (left.includes(right) || right.includes(left)))
  );
}

function parseAnalysis(text: string): StoryAnalysis | null {
  try {
    const json = text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    return analysisSchema.parse(JSON.parse(json));
  } catch {
    return null;
  }
}

function defaultBeat(state: StoryState, scenarioGoal: string): StoryBeat {
  return {
    objective: scenarioGoal || "Continue the present relationship and situation",
    obstacle:
      "The immediate obstacle must emerge from the established scenario and character motivations.",
    stakes:
      "Let consequences grow from existing choices; do not invent unrelated danger.",
    progress: 0,
    status: "active",
    introducedTurn: state.turnCount,
  };
}

function normalizeState(state: StoryState, scenarioGoal: string): StoryState {
  return {
    ...state,
    currentBeat: state.currentBeat ?? defaultBeat(state, scenarioGoal),
    recentResponseLengths: state.recentResponseLengths ?? [],
    recentDescriptionLevels: state.recentDescriptionLevels ?? [],
    leadOwner: state.leadOwner ?? "shared",
  };
}

const lengthRanges: Record<ResponseLength, [number, number]> = {
  brief: [35, 80],
  standard: [80, 160],
  extended: [160, 280],
};

function stabilizeResponsePlan(input: {
  requested: ResponsePlan;
  state: StoryState;
  decision: StoryDirection["decision"];
  signals: StoryAnalysis["signals"];
  latestUserMessage: string;
  softNudge: boolean;
}): ResponsePlan {
  const recentLengths = input.state.recentResponseLengths ?? [];
  const recentDescriptions = input.state.recentDescriptionLevels ?? [];
  const importantSignal = input.signals.some(
    (signal) => signal.weight >= 20 && signal.type !== "goal_progress",
  );
  let length = input.requested.length;

  if (
    input.decision === "hold" &&
    !importantSignal &&
    input.latestUserMessage.trim().split(/\s+/).length <= 10
  ) {
    length = "brief";
  } else if (input.decision === "transition" && length === "brief") {
    length = "standard";
  }

  const lastTwoLengths = recentLengths.slice(-2);
  if (
    lastTwoLengths.length === 2 &&
    lastTwoLengths.every((item) => item === length) &&
    input.decision === "hold" &&
    !importantSignal
  ) {
    length = length === "brief" ? "standard" : "brief";
  }

  let description = input.requested.description;
  const lastTwoDescriptions = recentDescriptions.slice(-2);
  if (
    input.decision === "hold" &&
    description !== "none" &&
    lastTwoDescriptions.length === 2 &&
    lastTwoDescriptions.every((item) => item !== "none")
  ) {
    description = "none";
  }
  if (input.decision === "transition" && description === "none") {
    description = "light";
  }

  const [minimum, maximum] = lengthRanges[length];
  return {
    ...input.requested,
    length,
    targetWords: clamp(input.requested.targetWords, minimum, maximum),
    description,
    initiative: input.softNudge ? "character" : input.requested.initiative,
  };
}

export function createInitialStoryState(input: {
  scenarioGoal: string;
  scenarioDescription: string;
  location?: string | null;
  time?: string | null;
}): StoryState {
  return {
    turnCount: 0,
    phase: "opening",
    tension: 10,
    momentum: 0,
    trust: 0,
    affinity: 0,
    conflict: 0,
    currentLocation: input.location ?? null,
    currentTime: input.time ?? null,
    openThreads: input.scenarioGoal ? [input.scenarioGoal] : [],
    establishedFacts: [],
    lastTransitionTurn: 0,
    calmTurns: 0,
    version: 1,
    currentBeat: {
      objective: input.scenarioGoal || "Discover what this encounter becomes",
      obstacle:
        input.scenarioDescription ||
        "The characters must discover what they want from this encounter.",
      stakes:
        "Consequences must arise from the scenario, relationship, and participant choices.",
      progress: 0,
      status: "active",
      introducedTurn: 0,
    },
    recentResponseLengths: [],
    recentDescriptionLevels: [],
    leadOwner: "shared",
  };
}

export function restoreStoryState(
  value: unknown,
  fallback: StoryState,
  scenarioGoal: string,
): StoryState {
  const record = asRecord(value);
  if (!record) return normalizeState(fallback, scenarioGoal);
  const beat = storyBeatSchema.safeParse(record.currentBeat);
  const lengths = z
    .array(z.enum(["brief", "standard", "extended"]))
    .max(6)
    .safeParse(record.recentResponseLengths);
  const descriptions = z
    .array(z.enum(["none", "light", "immersive"]))
    .max(6)
    .safeParse(record.recentDescriptionLevels);
  const leadOwner = z
    .enum(["user", "shared", "character"])
    .safeParse(record.leadOwner);
  return normalizeState(
    {
      ...fallback,
      currentBeat: beat.success ? beat.data : fallback.currentBeat,
      recentResponseLengths: lengths.success
        ? lengths.data
        : fallback.recentResponseLengths,
      recentDescriptionLevels: descriptions.success
        ? descriptions.data
        : fallback.recentDescriptionLevels,
      leadOwner: leadOwner.success ? leadOwner.data : fallback.leadOwner,
    },
    scenarioGoal,
  );
}

export function storyStateColumns(state: StoryState) {
  return {
    turnCount: state.turnCount,
    phase: state.phase,
    tension: state.tension,
    momentum: state.momentum,
    trust: state.trust,
    affinity: state.affinity,
    conflict: state.conflict,
    currentLocation: state.currentLocation,
    currentTime: state.currentTime,
    openThreads: state.openThreads,
    establishedFacts: state.establishedFacts,
    lastTransitionTurn: state.lastTransitionTurn,
    calmTurns: state.calmTurns,
    version: state.version,
  };
}

export async function directStoryTurn(input: {
  client: StreamingAiClient;
  state: StoryState;
  recentMessages: { role: string; content: string }[];
  scenarioGoal: string;
}): Promise<StoryDirection> {
  const state = normalizeState(input.state, input.scenarioGoal);
  const system = `You are a story director for character roleplay. Analyze the latest user turn, but do not write the character reply.

Protect continuity and user agency, but do not make the character passive. The character is allowed to disagree, challenge assumptions, refuse requests, set boundaries, propose plans, take plausible actions, reveal established knowledge, and lead an existing story thread. Never decide the user's dialogue, thoughts, feelings, choices, or actions.

DEFAULT TO HOLD for plot movement. Natural conversation is valuable. Never manufacture danger, revelations, interruptions, arrivals, time skips, location changes, or emotional breakthroughs just to create excitement.

Definitions:
- hold: continue the present beat; direct reaction, conversation, character initiative, small gestures, or a reminder of an already established thread.
- develop: an earned consequence, relationship change, obstacle response, or progress inside the same scene. Keep location and time continuous.
- transition: a real scene/phase/location/time change. Use only when the user initiates it or established causes make it inevitable.

Plan response rhythm dynamically:
- brief (35-80 words): quick exchange, direct answer, small reaction, banter, or low-stakes action.
- standard (80-160 words): most meaningful exchanges with reaction plus consequence.
- extended (160-280 words): earned turning point, emotional complexity, major revelation, confrontation, or scene transition. Never choose extended merely because the user's message is long.
- description controls environmental narration. Use none when place/time have not changed and sensory detail adds nothing; light for one or two relevant details; immersive only for a transition or moment where environment materially affects meaning.
- initiative=user leaves the next move mostly open; shared reacts and adds a meaningful handle; character means the character actively proposes, challenges, decides, or acts within their own agency.
- Vary rhythm. Do not choose the same length, description pattern, or ending mechanically.

Every response must react to what the user actually did. It may then add a consequence or an actionable story handle. A handle can be an action, proposal, disagreement, discovery, boundary, silence, object, or unresolved tension; it does not have to be a question.

Evidence must closely reference actual conversation. Treat the scenario goal as context, not an order. Return JSON only with: proposedMode, confidence, explicitTransitionRequest, calmInteraction, reason, signals[{type,evidence,weight 0-40}], delta{tension,trust,affinity,conflict,newPhase,newLocation,newTime,addThreads,resolveThreads,addFacts,beatProgress,resolveCurrentBeat,nextBeat}, responsePlan{length,targetWords,description,initiative,focus,characterMove,ending}, responseGuidance.`;
  const response = await input.client.generateText({
    system,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: `CURRENT STATE\n${JSON.stringify(state)}\n\nSCENARIO GOAL (context, not a progression order)\n${input.scenarioGoal}\n\nRECENT CONVERSATION\n${input.recentMessages
          .slice(-12)
          .map((message) => `${message.role}: ${message.content}`)
          .join("\n")}`,
      },
    ],
  });
  const analysis = parseAnalysis(response);
  if (!analysis) {
    return holdDirection(
      state,
      "Director output was invalid; preserving the current beat.",
    );
  }

  const signalWeight = analysis.signals.reduce(
    (sum, signal) => sum + signal.weight,
    0,
  );
  const signalKinds = new Set(
    analysis.signals
      .filter((signal) => signal.weight >= 15)
      .map((signal) => signal.type),
  ).size;
  const proposedMomentum = clamp(
    state.momentum + signalWeight - (analysis.calmInteraction ? 8 : 3),
  );
  const turnsSinceTransition = state.turnCount + 1 - state.lastTransitionTurn;
  let decision: StoryDirection["decision"] = "hold";
  if (
    analysis.proposedMode === "transition" &&
    analysis.confidence >= 0.82 &&
    (analysis.explicitTransitionRequest ||
      (state.turnCount >= 8 &&
        turnsSinceTransition >= 6 &&
        proposedMomentum >= 70 &&
        signalKinds >= 2))
  ) {
    decision = "transition";
  } else if (
    analysis.proposedMode !== "hold" &&
    !analysis.calmInteraction &&
    analysis.confidence >= 0.65 &&
    state.turnCount >= 2 &&
    signalWeight >= 20
  ) {
    decision = "develop";
  }

  const softNudge =
    decision === "hold" &&
    state.calmTurns >= 2 &&
    state.openThreads.length > 0;
  const latestUserMessage =
    [...input.recentMessages].reverse().find((message) => message.role === "user")
      ?.content ?? "";
  const responsePlan = stabilizeResponsePlan({
    requested: analysis.responsePlan,
    state,
    decision,
    signals: analysis.signals,
    latestUserMessage,
    softNudge,
  });
  const relationshipLimit = decision === "hold" ? 2 : 5;
  const currentBeat = state.currentBeat ?? defaultBeat(state, input.scenarioGoal);
  const beatResolved =
    decision !== "hold" && analysis.delta.resolveCurrentBeat;
  const nextBeat = analysis.delta.nextBeat;
  const updatedBeat: StoryBeat =
    beatResolved && nextBeat
      ? {
          ...nextBeat,
          progress: 0,
          status: "active",
          introducedTurn: state.turnCount + 1,
        }
      : {
          ...currentBeat,
          progress:
            decision === "hold"
              ? currentBeat.progress
              : clamp(currentBeat.progress + analysis.delta.beatProgress),
          status: beatResolved ? "resolved" : currentBeat.status,
        };

  const after: StoryState = {
    ...state,
    turnCount: state.turnCount + 1,
    tension: clamp(
      state.tension +
        Math.max(
          -relationshipLimit,
          Math.min(relationshipLimit, analysis.delta.tension),
        ),
    ),
    trust: clamp(
      state.trust +
        Math.max(-relationshipLimit, Math.min(relationshipLimit, analysis.delta.trust)),
      -100,
      100,
    ),
    affinity: clamp(
      state.affinity +
        Math.max(-relationshipLimit, Math.min(relationshipLimit, analysis.delta.affinity)),
      -100,
      100,
    ),
    conflict: clamp(
      state.conflict +
        Math.max(-relationshipLimit, Math.min(relationshipLimit, analysis.delta.conflict)),
      -100,
      100,
    ),
    momentum: decision === "transition" ? 15 : proposedMomentum,
    calmTurns: analysis.calmInteraction ? state.calmTurns + 1 : 0,
    phase:
      decision === "transition" && analysis.delta.newPhase
        ? analysis.delta.newPhase
        : state.phase,
    currentLocation:
      decision === "transition" && analysis.delta.newLocation
        ? analysis.delta.newLocation
        : state.currentLocation,
    currentTime:
      decision === "transition" && analysis.delta.newTime
        ? analysis.delta.newTime
        : state.currentTime,
    openThreads: unique(
      [
        ...state.openThreads.filter(
          (thread) =>
            !analysis.delta.resolveThreads.some((resolution) =>
              threadMatches(thread, resolution),
            ),
        ),
        ...(decision === "hold" ? [] : analysis.delta.addThreads),
      ],
      20,
    ),
    establishedFacts: unique(
      [...state.establishedFacts, ...analysis.delta.addFacts],
      30,
    ),
    lastTransitionTurn:
      decision === "transition"
        ? state.turnCount + 1
        : state.lastTransitionTurn,
    currentBeat: updatedBeat,
    recentResponseLengths: [
      ...(state.recentResponseLengths ?? []),
      responsePlan.length,
    ].slice(-6),
    recentDescriptionLevels: [
      ...(state.recentDescriptionLevels ?? []),
      responsePlan.description,
    ].slice(-6),
    leadOwner: responsePlan.initiative,
    version: state.version + 1,
  };

  const guidance =
    decision === "hold"
      ? softNudge
        ? `Respond to the user first, then let the character gently bring forward one existing thread (${state.openThreads[0]}) through a plausible action, opinion, reminder, or proposal. Do not invent a new event or force compliance. ${analysis.responseGuidance}`
        : `Stay in the current moment and respond directly. The character may disagree, challenge, refuse, propose, or act when supported by persona and context. Do not add an unrelated event or force emotional progress. ${analysis.responseGuidance}`
      : decision === "develop"
        ? `Allow an earned consequence or relationship/goal development inside the current scene. Preserve location and time. Give the character a genuine stance rather than automatic agreement. ${analysis.responseGuidance}`
        : `Make the earned transition continuous and causally clear. Preserve user agency and let both participants influence what follows. ${analysis.responseGuidance}`;

  return {
    decision,
    confidence: analysis.confidence,
    reason: analysis.reason,
    signals: analysis.signals,
    guidance,
    responsePlan,
    softNudge,
    before: state,
    after,
  };
}

export function holdDirection(
  rawState: StoryState,
  reason: string,
): StoryDirection {
  const state = normalizeState(rawState, rawState.openThreads[0] ?? "");
  const softNudge = state.calmTurns >= 2 && state.openThreads.length > 0;
  const responsePlan = stabilizeResponsePlan({
    requested: {
      ...defaultResponsePlan,
      length: "brief",
      targetWords: 70,
      description: "none",
      initiative: softNudge ? "character" : "shared",
    },
    state,
    decision: "hold",
    signals: [],
    latestUserMessage: "",
    softNudge,
  });
  const after: StoryState = {
    ...state,
    turnCount: state.turnCount + 1,
    momentum: clamp(state.momentum - 5),
    calmTurns: state.calmTurns + 1,
    recentResponseLengths: [
      ...(state.recentResponseLengths ?? []),
      responsePlan.length,
    ].slice(-6),
    recentDescriptionLevels: [
      ...(state.recentDescriptionLevels ?? []),
      responsePlan.description,
    ].slice(-6),
    leadOwner: responsePlan.initiative,
    version: state.version + 1,
  };
  return {
    decision: "hold",
    confidence: 1,
    reason,
    signals: [],
    guidance: softNudge
      ? `Respond directly, then gently reactivate the existing thread "${state.openThreads[0]}" through character agency. Do not invent a new event.`
      : "Stay in the current conversational beat. Let the character respond with a real opinion or boundary when appropriate, but do not add unrelated plot developments.",
    responsePlan,
    softNudge,
    before: state,
    after,
  };
}

export function storyDirectionPrompt(direction: StoryDirection) {
  const plan = direction.responsePlan;
  const beat = direction.after.currentBeat;
  const range = lengthRanges[plan.length];
  return `STORY DIRECTOR — ${direction.decision.toUpperCase()}
${direction.guidance}

RESPONSE RHYTHM
- Length: ${plan.length}; aim for ${plan.targetWords} words (natural range ${range[0]}-${range[1]}). Stop when the beat is complete; never pad to hit a number.
- Environmental description: ${plan.description}. Do not restate scenery already known unless it changes, affects an action, or carries emotional meaning.
- Initiative: ${plan.initiative}. Character move: ${plan.characterMove}. Primary focus: ${plan.focus}.
- Ending shape: ${plan.ending}. Do not mechanically end with a question.
- Begin by acknowledging the user's actual contribution. Then add only what this character can plausibly say, decide, refuse, propose, reveal, or do.
- The character has beliefs, desires, blind spots, and boundaries. Agreement is not the default. Use disagreement or resistance only when it follows from persona, evidence, or stakes—not to create arbitrary conflict.
- Never write the user's actions, thoughts, feelings, or decisions.

CURRENT BEAT
Objective: ${beat?.objective || "Continue the established interaction"}
Obstacle: ${beat?.obstacle || "Not yet established"}
Stakes: ${beat?.stakes || "Let consequences emerge naturally"}
Progress: ${beat?.progress ?? 0}/100; status=${beat?.status ?? "active"}.

CONTINUITY
Location=${direction.after.currentLocation || "unchanged"}; time=${direction.after.currentTime || "unchanged"}; phase=${direction.after.phase}.
Open threads (possibilities, not mandatory beats): ${direction.after.openThreads.join(" | ") || "none"}.
Established facts: ${direction.after.establishedFacts.join(" | ") || "none"}.
Relationship state (internal; never state as numbers): trust=${direction.after.trust}, affinity=${direction.after.affinity}, conflict=${direction.after.conflict}, tension=${direction.after.tension}.`;
}
