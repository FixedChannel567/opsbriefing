import assert from "node:assert/strict";
import test from "node:test";
import { clusterTopicArticles, compareStoryArticles, isRelevantToTopic, selectTopStories } from "../lib/story-cluster.mjs";

const chinaTopic = {
  id: "china-taiwan",
  keywords: ["taiwan", "south china sea", "beijing", "china military"],
  priority: 8,
};

const article = (outlet, title, evidence) => ({
  outlet,
  title,
  evidence,
  url: `https://${outlet.toLowerCase().replaceAll(" ", "")}.test/${encodeURIComponent(title)}`,
  seenAt: "Tue, 28 Jul 2026 12:00:00 GMT",
});

test("rejects a climate feature that only mentions Taiwan as a place", () => {
  const climate = article("Guardian", "From Afghanistan to Taiwan, unprecedented deluge highlights climate breakdown", "Flash floods and typhoons have affected communities across Asia.");
  assert.equal(isRelevantToTopic(climate, chinaTopic), false);
});

test("does not merge Peru-China rivalry with a South China Sea shipwreck", () => {
  const peru = article("DW", "Peru president takes office amid China-US balancing act", "The new government will navigate Washington and Beijing geopolitical rivalry.");
  const ship = article("BBC", "Fifteen missing after vessel sinks in disputed South China Sea waters", "China said it rescued 47 people from the cargo vessel.");
  const comparison = compareStoryArticles(peru, ship, chinaTopic);
  assert.equal(comparison.sameStory, false);
});

test("groups differently worded reports about the same Taiwan military drill", () => {
  const first = article("BBC", "China launches military drills around Taiwan", "Beijing said the exercises involved naval and air forces.");
  const second = article("France 24", "Taiwan condemns new Chinese exercises near the island", "The military drill followed a warning from Beijing.");
  const comparison = compareStoryArticles(first, second, chinaTopic);
  assert.equal(comparison.sameStory, true);
  const [cluster] = clusterTopicArticles([first, second], chinaTopic);
  assert.equal(cluster.articles.length, 2);
});

test("does not merge separate attacks merely because they share a conflict theater", () => {
  const ukraineTopic = { id: "ukraine", keywords: ["ukraine", "kyiv", "zelensky", "russian strike"], priority: 10 };
  const kyiv = article("BBC", "Russian attack damages homes in Kyiv", "Ukraine said drones struck residential buildings in the capital.");
  const odesa = article("Guardian", "Deaths reported after missile strike on Odesa port", "Ukraine officials said an attack damaged grain infrastructure.");
  assert.equal(compareStoryArticles(kyiv, odesa, ukraineTopic).sameStory, false);
});

test("selects only independently cross-sourced stories", () => {
  const drills = [
    article("BBC", "China launches military drills around Taiwan", "Beijing said the exercises involved naval forces."),
    article("France 24", "Taiwan condemns new Chinese exercises", "The military drill followed a warning from Beijing."),
  ];
  const singleton = article("DW", "Peru president takes office amid China-US balancing act", "The government will navigate Washington and Beijing rivalry.");
  const selected = selectTopStories([...drills, singleton], [chinaTopic], 5);
  assert.equal(selected.length, 1);
  assert.deepEqual(selected[0].articles.map((item) => item.outlet).sort(), ["BBC", "France 24"]);
});
