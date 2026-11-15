# Accessibility

**Summary:** The interface can be operated with a keyboard alone and works with a screen reader. Round 1 found no blocking failures, and one open issue: some controls are announced only as "name + button". We have not tested with blind or low-vision users.

## What we tested

Tested on the published demo (https://socotlalli-nasa-space-apps-2026.vercel.app), round 1, November 14, 2026. Tester: Lawrence Garcia, team member.

| # | Test | Result | Details |
|---|------|--------|---------|
| 1 | Keyboard only | Pass | The menu can be operated with the keyboard alone. |
| 2 | Screen reader | Partial | The screen reader works, but some controls are announced only as their name plus "button", without saying what they do. |
| 3 | Live text | Pass | The descriptive text is read without interrupting the audio. |
| 4 | Eyes closed | Not done as designed | See below. |
| 5 | Contrast and focus | Pass | Text contrast is sufficient. |

Screen reader and browser used: TODO (for example NVDA on Windows with Chrome).

## Test 4: what we did and did not do

The eyes-closed test is meant to check whether someone outside the team can tell a normal frame from an anomalous one by sound alone. We did not run it that way. A team member read the text on the page and understood how the notes work: the pitch moves up or down depending on how good or bad the values are. This shows that the on-page explanation is understandable, but it does not show that the sound alone communicates the data.

## Open issues

- Some controls are announced only as "name + button". Fix: add descriptive labels (for example, "Play" instead of just the control's name).
- TODO: add the issues found in later rounds.

## Limits

- We did not test with blind or low-vision users. Testing with them is the next step.
- The eyes-closed test with someone outside the team is still pending.
- Tests were done by one person, with one screen reader and one browser.
