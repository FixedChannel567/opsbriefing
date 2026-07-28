# Methodology

OpsBriefing is a source-backed aggregation and research interface. It is not a claim-verification authority and does not guarantee that a publisher's initial account will remain unchanged.

## Pipeline

1. Fetch direct RSS feeds concurrently from configured international newsrooms for discovery.
2. Normalize XML, remove unsafe markup, and apply a geopolitical relevance gate.
3. Require articles to share both a theater or actor and a concrete event concept before grouping them into the same story.
4. Reject single-publisher clusters and order cross-sourced stories using source breadth, recency, theater priority, and observable consequence language.
5. Request the selected public article pages with strict timeouts and without bypassing access controls.
6. Prefer structured `NewsArticle` bodies, then semantic article content, and disclose RSS descriptions as fallbacks.
7. Segment article bodies and rank passages using the exact story's shared terms, actions, dates, quantities, and impact language.
8. Compare passages inside that story cluster for materially related reporting without calling repetition verification.
9. Attach labeled strategic context, connections, uncertainties, and numbered article citations.
10. Resolve map locations from the current source pack and save a D1 snapshot for next-day comparison.

## What “Changed” Means

The daily delta compares observable application inputs:

- Lead headline
- Publisher roster
- Number of publishers
- Resolved map location

It does not infer classified activity, predict intent, or convert editorial consensus into certainty.

## Location Resolution

The local gazetteer maps supported place names to real latitude and longitude values. Resolution chooses the most frequently mentioned supported place in the event's current source cluster. The UI discloses when no place is found and a regional fallback is used.

## Evidence Boundaries

- Reported passages come from public article bodies when available and link to the original article.
- Full-article and feed-fallback evidence are visibly distinguished.
- “Why it matters,” connections, uncertainties, and watch items are analytical frameworks written by the application and labeled accordingly.
- Related reporting does not establish that publishers independently verified a claim.
- A shared country name is never sufficient to admit an article to an event.
- Feed descriptions and automatically selected passages can be incomplete. Readers should open citations before relying on a report for decisions.
- Breaking coverage can be corrected, reframed, or withdrawn by publishers.
