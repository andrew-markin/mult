# Mult

Multiplication trainer. A progressive web app that drills the multiplication table from 2 × 2 to
9 × 9, along with division by it, and keeps asking the facts you don't know yet until you do.

## How to use

1. Look at the question and answer it in your head.
2. Tap **Reveal the answer** (or press Space / Enter).
3. Be honest: tap **I knew** (→) or **I didn't know** (←).

The badge in the top right corner shows the share of facts whose last answer was correct. Press and
hold it for a second to reset all progress. Progress is kept in the browser's local storage, so
it survives reloads and works offline once the app is installed.

Both `a × b` and `b × a` are asked separately on purpose: recognizing either form is part of the
training. So are both divisions they turn into, `ab ÷ a` and `ab ÷ b`, mixed into the same flow,
128 facts in all. Multiplying by 1 is too trivial to be worth drilling, hence the table starts
with 2.

## Languages

The app speaks the first of the browser's preferred languages it has a translation for, and
switches on the fly when that preference changes. Numbers are formatted for the user's locale, so
for instance Arabic in Egypt gets Eastern Arabic digits, and right-to-left languages get a mirrored
layout, while the arithmetic itself still reads left to right. Translations live in
[`src/locales.js`](src/locales.js): to add a language, add its four strings there, keyed by its
language code (with a region or script when needed, like `pt-PT` or `zh-Hant`).

## How questions are picked

Every answer advances an iteration counter. For each fact the trainer remembers the iteration it was
last asked at and how many times in a row it was answered correctly. The next question is drawn at
random, weighted as follows (related facts are the ones sharing factors, like 6 × 7, 7 × 6, 42 ÷ 6
and 42 ÷ 7, so that one doesn't give the answer to another away):

| Fact state                                      | Weight                         |
| ----------------------------------------------- | ------------------------------ |
| It or a related fact asked in last 5 iterations | excluded                       |
| Never asked                                     | 100                            |
| Last answer was wrong                           | 50                             |
| Answered correctly less than 20 iterations ago  | 1                              |
| Answered correctly earlier                      | 30 − 3 × min(correct, 9), 27…3 |

So new facts keep flowing in, mistakes come back soon, and well-known facts are confirmed every now
and then, less often the more times they have been confirmed. The rules live in
[`src/trainer.js`](src/trainer.js).

## Development

```sh
npm install
npm run dev      # dev server at http://localhost:8085
npm test         # unit tests (Vitest)
npm run lint     # oxlint + ESLint, with fixes
npm run format   # Prettier
npm run build    # production build into dist/
```

iOS ignores the web app manifest for launch screens, so the build generates plain background
launch images for every iPhone and iPad screen size with
[`plugins/ios-splash-screens.js`](plugins/ios-splash-screens.js). When Apple releases a device with
a new screen size, add it to the list there, otherwise the app launches with a white screen on it.

## Deployment

Every push to `main` runs the tests, builds the app and publishes `dist/` to the `gh-pages` branch
via [GitHub Actions](.github/workflows/deploy.yml). The custom domain is set by
[`public/CNAME`](public/CNAME).
