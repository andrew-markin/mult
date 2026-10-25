# Mult

Multiplication trainer. A progressive web app that drills the multiplication table from 2 × 2 to
9 × 9 and keeps asking the facts you don't know yet until you do.

## How to use

1. Look at the question and answer it in your head.
2. Tap **Reveal the answer** (or press Space / Enter).
3. Be honest: tap **I knew** (→) or **I didn't know** (←).

The badge in the top right corner shows the share of facts whose last answer was correct. Press and
hold it for a second to reset all progress. Progress is kept in the browser's local storage, so
it survives reloads and works offline once the app is installed.

Both `a × b` and `b × a` are asked separately on purpose: recognizing either form is part of the
training. Multiplying by 1 is too trivial to be worth drilling, hence the table starts with 2.

## How questions are picked

Every answer advances an iteration counter. For each fact the trainer remembers the iteration it was
last asked at and how many times in a row it was answered correctly. The next question is drawn at
random, weighted as follows:

| Fact state                                     | Weight                         |
| ---------------------------------------------- | ------------------------------ |
| Asked within the last 5 iterations             | excluded                       |
| Never asked                                    | 100                            |
| Last answer was wrong                          | 50                             |
| Answered correctly less than 20 iterations ago | 1                              |
| Answered correctly earlier                     | 30 − 3 × min(correct, 9), 27…3 |

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

## Deployment

Every push to `main` runs the tests, builds the app and publishes `dist/` to the `gh-pages` branch
via [GitHub Actions](.github/workflows/deploy.yml). The custom domain is set by
[`public/CNAME`](public/CNAME).
