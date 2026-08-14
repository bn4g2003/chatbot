import assert from "node:assert/strict";
import test from "node:test";
import type { StreamingAiClient } from "../lib/ai";
import { directStoryTurn, type StoryState } from "../lib/story-director";

const initialState: StoryState = {
  turnCount: 4,
  phase: "opening",
  tension: 10,
  momentum: 10,
  trust: 0,
  affinity: 0,
  conflict: 0,
  currentLocation: "library",
  currentTime: "midnight",
  openThreads: [],
  establishedFacts: [],
  lastTransitionTurn: 0,
  calmTurns: 2,
  version: 1,
};
function clientWith(result: unknown): StreamingAiClient {
  return {
    async generateText() {
      return JSON.stringify(result);
    },
    async *streamText() {
      yield "";
    },
  };
}
const baseDelta = {
  tension: 0,
  trust: 0,
  affinity: 0,
  conflict: 0,
  newPhase: null,
  newLocation: null,
  newTime: null,
  addThreads: [],
  resolveThreads: [],
  addFacts: [],
};

test("calm conversation cannot be forced into development", async () => {
  const direction = await directStoryTurn({
    client: clientWith({
      proposedMode: "transition",
      confidence: 0.99,
      explicitTransitionRequest: false,
      calmInteraction: true,
      reason: "The director wanted novelty",
      signals: [
        { type: "emotional_shift", evidence: "small talk", weight: 30 },
      ],
      delta: { ...baseDelta, newLocation: "forest" },
      responseGuidance: "Move away",
    }),
    state: initialState,
    recentMessages: [
      { role: "user", content: "Mình cứ ngồi đây uống trà nhé." },
    ],
    scenarioGoal: "Find a book",
  });
  assert.equal(direction.decision, "hold");
  assert.equal(direction.after.currentLocation, "library");
});

test("explicit user transition is allowed without arbitrary turn minimum", async () => {
  const direction = await directStoryTurn({
    client: clientWith({
      proposedMode: "transition",
      confidence: 0.95,
      explicitTransitionRequest: true,
      calmInteraction: false,
      reason: "User leaves for the observatory",
      signals: [
        {
          type: "explicit_change",
          evidence: "I go to the observatory",
          weight: 40,
        },
      ],
      delta: {
        ...baseDelta,
        newPhase: "observatory",
        newLocation: "observatory",
      },
      responseGuidance: "Follow the user's movement",
    }),
    state: { ...initialState, turnCount: 1 },
    recentMessages: [
      {
        role: "user",
        content: "Tôi rời thư viện và đi thẳng tới đài quan sát.",
      },
    ],
    scenarioGoal: "Find a book",
  });
  assert.equal(direction.decision, "transition");
  assert.equal(direction.after.currentLocation, "observatory");
});
