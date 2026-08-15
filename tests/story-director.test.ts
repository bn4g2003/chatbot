import assert from "node:assert/strict";
import test from "node:test";
import type { StreamingAiClient } from "../lib/ai";
import {
  createInitialStoryState,
  directStoryTurn,
  restoreStoryState,
  storyDirectionPrompt,
  type StoryState,
} from "../lib/story-director";

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

test("short calm turns receive concise replies without redundant scenery", async () => {
  const direction = await directStoryTurn({
    client: clientWith({
      proposedMode: "hold",
      confidence: 0.9,
      explicitTransitionRequest: false,
      calmInteraction: true,
      reason: "A direct low-stakes reply",
      signals: [],
      delta: baseDelta,
      responsePlan: {
        length: "extended",
        targetWords: 240,
        description: "immersive",
        initiative: "shared",
        focus: "dialogue",
        characterMove: "respond",
        ending: "statement",
      },
      responseGuidance: "Answer naturally",
    }),
    state: {
      ...initialState,
      recentDescriptionLevels: ["light", "immersive"],
    },
    recentMessages: [{ role: "user", content: "Ừ, tôi hiểu rồi." }],
    scenarioGoal: "Find a book",
  });
  assert.equal(direction.responsePlan.length, "brief");
  assert.equal(direction.responsePlan.description, "none");
  assert.ok(direction.responsePlan.targetWords <= 80);
});

test("character can gently lead an existing thread after calm turns", async () => {
  const direction = await directStoryTurn({
    client: clientWith({
      proposedMode: "hold",
      confidence: 0.88,
      explicitTransitionRequest: false,
      calmInteraction: true,
      reason: "Conversation is calm",
      signals: [],
      delta: baseDelta,
      responsePlan: {
        length: "standard",
        targetWords: 110,
        description: "light",
        initiative: "user",
        focus: "dialogue",
        characterMove: "respond",
        ending: "offer",
      },
      responseGuidance: "Keep the exchange grounded",
    }),
    state: {
      ...initialState,
      calmTurns: 3,
      openThreads: ["Find the forbidden book"],
    },
    recentMessages: [{ role: "user", content: "Cứ ngồi đây thêm chút nữa." }],
    scenarioGoal: "Find the forbidden book",
  });
  assert.equal(direction.decision, "hold");
  assert.equal(direction.softNudge, true);
  assert.equal(direction.responsePlan.initiative, "character");
  assert.match(direction.guidance, /existing thread/i);
});

test("director prompt grants character agency without taking user agency", async () => {
  const direction = await directStoryTurn({
    client: clientWith({
      proposedMode: "develop",
      confidence: 0.91,
      explicitTransitionRequest: false,
      calmInteraction: false,
      reason: "The user challenges the character's belief",
      signals: [
        { type: "conflict", evidence: "I disagree with you", weight: 25 },
      ],
      delta: { ...baseDelta, conflict: 2, beatProgress: 10 },
      responsePlan: {
        length: "standard",
        targetWords: 130,
        description: "none",
        initiative: "character",
        focus: "emotion",
        characterMove: "disagree",
        ending: "statement",
      },
      responseGuidance: "Defend the belief with specific reasoning",
    }),
    state: initialState,
    recentMessages: [
      { role: "user", content: "Tôi không đồng ý với cách cô nhìn chuyện đó." },
    ],
    scenarioGoal: "Find a book",
  });
  const prompt = storyDirectionPrompt(direction);
  assert.equal(direction.decision, "develop");
  assert.match(prompt, /Character move: disagree/);
  assert.match(prompt, /Never write the user's actions/);
  assert.match(prompt, /Agreement is not the default/);
});

test("extended beat state survives JSON event restoration", () => {
  const initial = createInitialStoryState({
    scenarioGoal: "Open the sealed archive",
    scenarioDescription: "The archivist distrusts outsiders",
    location: "archive",
    time: "midnight",
  });
  const restored = restoreStoryState(
    {
      ...initial,
      currentBeat: { ...initial.currentBeat, progress: 35 },
      recentResponseLengths: ["brief", "standard"],
      leadOwner: "character",
    },
    initial,
    "Open the sealed archive",
  );
  assert.equal(restored.currentBeat?.progress, 35);
  assert.deepEqual(restored.recentResponseLengths, ["brief", "standard"]);
  assert.equal(restored.leadOwner, "character");
});
