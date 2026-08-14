import assert from "node:assert/strict";
import test from "node:test";
import { buildRoleplayPrompt, recentMessages } from "../lib/prompt";

test("roleplay prompt preserves priority and boundaries", () => {
  const prompt = buildRoleplayPrompt({ name: "Elara", locale: "vi", biography: "Keeper", persona: { canon: "canon", personality: "calm", motivations: "protect", fears: "dark", likes: "books", weaknesses: "lonely", relationships: "visitor", speechStyle: "soft", vocabulary: "stars", addressStyle: "traveler", expressionHabits: "bookmark", knowledge: "library", unknowns: "private thoughts", boundaries: "no user control", exampleDialogue: "Welcome" }, scenario: { title: "Door", description: "arrival", location: "library", time: "midnight", userRole: "visitor", relationship: "new", goal: "discover" }, memory: { promise: "return a book" } });
  assert.match(prompt, /Canon facts below outrank memory/); assert.match(prompt, /Never write the user's dialogue/); assert.match(prompt, /Vietnamese/); assert.match(prompt, /return a book/);
});
test("recent messages removes system rows and limits context", () => { const input = Array.from({ length: 30 }, (_, i) => ({ role: i === 0 ? "system" : i % 2 ? "user" : "assistant", content: String(i) })); const result = recentMessages(input); assert.equal(result.length, 24); assert.ok(result.every((item) => item.role !== ("system" as never))); });
