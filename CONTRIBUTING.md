# Contributing

Thanks for taking an interest in OpsBriefing. This repository favors small, evidence-driven changes that preserve attribution and keep the briefing readable.

## Development

1. Install Node.js 22 or newer.
2. Run `npm ci`.
3. Start the local app with `npm run dev`.
4. Run `npm run check` before opening a pull request.

## Feed Changes

Every feed parser change must include or update a fixture in `tests/fixtures`. Fixtures should be short synthetic examples that exercise the relevant publisher format without reproducing copyrighted articles.

## Editorial Rules

- Never show an uncited factual passage.
- Keep publisher-provided reporting separate from analytical watchpoints.
- Do not present source breadth as certainty.
- Document new ranking or location-resolution rules in `METHODOLOGY.md`.
- Add graceful failure behavior for every external dependency.

## Pull Requests

Explain the user-facing behavior, the evidence or failure mode behind the change, and how it was tested. Include screenshots for visual changes at desktop and mobile widths.
