# Notes for Claude

Mult is a multiplication and division trainer, a Vue 3 + Quasar PWA built with Vite and
deployed to GitHub Pages at https://mult.mayfleet.com. See README.md for how it works.

## Workflow

- Commit straight to `main` in small commits split by meaning, with a short English subject in
  the style of the history and no Co-Authored-By or other attribution.
- Before committing run `npm run lint`, `npm test` and `npm run build`. Look at visible changes in
  the browser, at a phone width too.
- Push only when asked. After a push watch the Deploy workflow and check the site; an installed
  PWA picks a new version up on the second launch.
- Dependabot opens weekly pull requests with updates; the Deploy workflow checks them without
  deploying.

## Periodic checks

At the start of a conversation, if a check below is due (its next date has passed, or its event
happened), remind the user of it in a line. Once it is done or the user puts it off, update the
dates here and commit.

| Check                                                                                                                                                                                            | Last done  | Next                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------- |
| New iPhone and iPad screen sizes are in `SCREENS` of `plugins/ios-splash-screens.js`, otherwise the app launches with a white screen on them                                                     | 2026-10-26 | 2027-09-20, after Apple's September event |
| The README animation `assets/demo.webp` matches the interface: re-record with `npm run demo`, then look at the frames (the hand stays a flat outlined icon, see the comments in `scripts/demo/`) | 2026-10-26 | after a visible change of the interface   |

## Decisions to keep

- Translations for am, km, ky, lo, mn, my, si, uz and zu were dropped as too uncertain, those
  users get English. Add them back only checked by a native speaker.
- Operation signs follow school traditions where they are known (`·` and `:`, or `×` and `:`);
  Spanish, Portuguese, Catalan, Swedish and Icelandic keep `×` and `÷` for lack of certainty.
- Heading lines of the README are drawn over floating images by GitHub, so no `#` or `##`
  heading may sit beside the animation; the text before "How to use" has to be long enough.
