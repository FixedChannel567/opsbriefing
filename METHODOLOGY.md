# Methodology

OpsBriefing is a source-backed aggregation interface. It is not a claim-verification authority and does not guarantee that a publisher's initial account will remain unchanged.

## Pipeline

1. Fetch direct RSS feeds concurrently from configured international newsrooms.
2. Normalize XML and remove scripts, styles, tags, encoded tags, and unsupported entities.
3. Match articles against version-controlled geopolitical topic dictionaries.
4. Keep one article per publisher in each topic cluster.
5. Order clusters by the number of independent configured publishers represented.
6. Select five clusters and preserve every article URL as a numbered citation.
7. Resolve map locations from place names that occur in current titles and descriptions.
8. Save one D1 snapshot per event and UTC day for next-day comparison.

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

- Factual paragraphs are publisher-supplied RSS descriptions and link to the original article.
- “Watch next” items are analytical prompts written by the application and are labeled accordingly.
- Feed descriptions can be incomplete. Readers should open citations before relying on a report for decisions.
- Breaking coverage can be corrected, reframed, or withdrawn by publishers.
