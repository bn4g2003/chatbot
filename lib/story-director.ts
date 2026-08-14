import { z } from "zod";
import type { StreamingAiClient } from "./ai";

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
};

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
  }),
  responseGuidance: z.string().max(1000),
});
export type StoryAnalysis = z.infer<typeof analysisSchema>;
export type StoryDirection = {
  decision: "hold" | "develop" | "transition";
  confidence: number;
  reason: string;
  signals: StoryAnalysis["signals"];
  guidance: string;
  before: StoryState;
  after: StoryState;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const unique = (items: string[], max: number) =>
  [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(-max);

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

export async function directStoryTurn(input: {
  client: StreamingAiClient;
  state: StoryState;
  recentMessages: { role: string; content: string }[];
  scenarioGoal: string;
}): Promise<StoryDirection> {
  const { state } = input;
  const system = `You are a conservative story director for a character roleplay. Analyze the user's latest turn, but do not write the character reply.

DEFAULT TO HOLD. Natural conversation is valuable and does not need a plot event. Never manufacture danger, revelations, interruptions, arrivals, time skips, location changes, or emotional breakthroughs just to make the story exciting.

Definitions:
- hold: continue the present beat; conversation, small gestures, and gradual rapport only.
- develop: a meaningful consequence or relationship/goal adjustment within the same scene. Keep location and time continuous.
- transition: a real scene/phase/location/time change. Propose only when the user explicitly initiates it, or when several independent established signals make it inevitable.

Evidence must quote or closely reference actual user input. A long message is not automatically important. Questions, jokes, silence, daily activities, flirting, and relaxed conversation normally mean hold. Do not treat the scenario goal as a demand to progress.

Return JSON only with: proposedMode, confidence, explicitTransitionRequest, calmInteraction, reason, signals[{type,evidence,weight 0-40}], delta{tension -10..10,trust -5..5,affinity -5..5,conflict -5..5,newPhase,newLocation,newTime,addThreads,resolveThreads,addFacts}, responseGuidance.`;
  const response = await input.client.generateText({
    system,
    messages: [
      {
        role: "user",
        content: `CURRENT STATE\n${JSON.stringify(state)}\n\nSCENARIO GOAL (context, not a progression order)\n${input.scenarioGoal}\n\nRECENT CONVERSATION\n${input.recentMessages
          .slice(-10)
          .map((message) => `${message.role}: ${message.content}`)
          .join("\n")}`,
      },
    ],
  });
  const analysis = parseAnalysis(response);
  if (!analysis)
    return holdDirection(
      state,
      "Director output was invalid; preserving the current beat.",
    );

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
    state.momentum + signalWeight - (analysis.calmInteraction ? 12 : 3),
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
  )
    decision = "transition";
  else if (
    analysis.proposedMode !== "hold" &&
    !analysis.calmInteraction &&
    analysis.confidence >= 0.65 &&
    state.turnCount >= 2 &&
    signalWeight >= 20
  )
    decision = "develop";

  const relationshipLimit = decision === "hold" ? 2 : 5;
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
        Math.max(
          -relationshipLimit,
          Math.min(relationshipLimit, analysis.delta.trust),
        ),
      -100,
      100,
    ),
    affinity: clamp(
      state.affinity +
        Math.max(
          -relationshipLimit,
          Math.min(relationshipLimit, analysis.delta.affinity),
        ),
      -100,
      100,
    ),
    conflict: clamp(
      state.conflict +
        Math.max(
          -relationshipLimit,
          Math.min(relationshipLimit, analysis.delta.conflict),
        ),
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
          (thread) => !analysis.delta.resolveThreads.includes(thread),
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
    version: state.version + 1,
  };
  const guidance =
    decision === "hold"
      ? "Stay in the current moment. Respond directly to the user. Do not introduce a new event, reveal a secret, change location/time, or force emotional progress."
      : decision === "develop"
        ? `Allow only a subtle, earned development inside the current scene. Do not change location or time. ${analysis.responseGuidance}`
        : `The transition is earned by the user's actions. Make it continuous and causally clear, not abrupt. ${analysis.responseGuidance}`;
  return {
    decision,
    confidence: analysis.confidence,
    reason: analysis.reason,
    signals: analysis.signals,
    guidance,
    before: state,
    after,
  };
}

export function holdDirection(
  state: StoryState,
  reason: string,
): StoryDirection {
  const after = {
    ...state,
    turnCount: state.turnCount + 1,
    momentum: clamp(state.momentum - 5),
    calmTurns: state.calmTurns + 1,
    version: state.version + 1,
  };
  return {
    decision: "hold",
    confidence: 1,
    reason,
    signals: [],
    guidance:
      "Stay in the current conversational beat. Do not add plot developments or change the scene.",
    before: state,
    after,
  };
}

export function storyDirectionPrompt(direction: StoryDirection) {
  return `STORY DIRECTOR — ${direction.decision.toUpperCase()}\n${direction.guidance}\nCurrent continuity: location=${direction.after.currentLocation || "unchanged"}; time=${direction.after.currentTime || "unchanged"}; phase=${direction.after.phase}.\nOpen story threads (possibilities, not mandatory beats): ${direction.after.openThreads.join(" | ") || "none"}.\nEstablished facts that must remain consistent: ${direction.after.establishedFacts.join(" | ") || "none"}.\nRelationship state (internal; never state as numbers): trust=${direction.after.trust}, affinity=${direction.after.affinity}, conflict=${direction.after.conflict}, tension=${direction.after.tension}.`;
}
