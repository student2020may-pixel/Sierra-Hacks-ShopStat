# ShopStats

ShopStats helps independent auto body shops see what's slowing down their repairs. A three-step shop
assessment takes an insurer scorecard and a jobs export, scores each metric, flags the jobs that dragged
on, and suggests the top three changes to cut repair time.

Built at Sierra Hacks 2026 by Ishaan Bhatnagar and Sidhak Makkar.

## Run it

```bash
npm install
cp .env.example .env   # then add your OpenAI key
npm run dev
```

`OPENAI_API_KEY` is the only setting. Without it the app still works on sample data, and each page
says so. `.env` is gitignored, so never commit it.

## Pages

| Page | What it does |
| --- | --- |
| `/assessment/scorecard` | **Step 1 of 3.** Upload a scorecard image or PDF (or try the sample). The AI reads each metric's value and target; scores are computed in code (below). |
| `/assessment/jobs` | **Step 2 of 3.** Upload a jobs CSV, enter up to 10 jobs by hand, or use the sample. Flags jobs that took far longer than their labor hours predict. |
| `/results` | **Step 3 of 3.** Stat sheet, top 3 AI fixes, a before/after estimate, and **Ask ShopStats** for questions about your own data. |
| `/mock-scorecard` | A fictional insurer scorecard for demos. |

Each step's result is kept in the browser tab, so Back and Next don't lose work. The old `/upload` and
`/jobs` links redirect to steps 1 and 2. A jobs CSV needs a job ID, labor hours, and either a days-in-shop
column or dates in and out.

## How scores are computed

The AI only **reads** numbers off the scorecard (plus a one-line explanation of each). Every 0–100
score is computed by a fixed formula in [`lib/scoring.ts`](lib/scoring.ts), so the same scorecard
always gets the same scores.

1. Measure how far the shop is from target as a fraction of the target, in the direction that
   matters. For lower-is-better metrics (cycle time, repair cost, supplement rate), being above target
   is a miss; for higher-is-better metrics (satisfaction, alternate parts, on-time delivery), being
   below target is a miss.
2. **Meets or beats target:** 85, plus up to 15 more points scaled by how far past target. 20% better
   than target or more scores 100.
3. **Misses target:** the score falls along straight lines through these points:

   | Miss | Score |
   | --- | --- |
   | just under 0% | 84 |
   | 10% | 70 |
   | 30% | 40 |
   | 60% | 10 |
   | 120% or worse | 0 |

Example: a cycle time of 11.8 days against a 7.5-day target is a 57% miss, which scores 13.

Metrics that aren't on the scorecard, or that come back as impossible values (a 142% rate, a
1,000-day cycle time), score nothing and are left off the charts.

The **shop level** is the average score of the metrics that were on the scorecard; the letter grade
is A (90+), B (80+), C (70+), D (60+), F (below 60).

## How slow jobs are found

[`lib/anomaly.ts`](lib/anomaly.ts) fits "expected days in shop" against labor hours with a robust line
(Theil–Sen), then flags jobs whose extra days are far above normal (median/MAD z-score over 3.5 and at
least 3 extra days). It's deterministic, so the same file flags the same jobs every time.

## What's AI and what isn't

- **AI (`gpt-5.4-mini`):** reading values and targets off the scorecard, the one-line explanations, the
  top 3 fixes and their "days saved" estimates, and Ask ShopStats answers. Ask ShopStats only sees this
  shop's scorecard, slow jobs, and fixes, and is told to say "I can't tell from your data" otherwise.
- **Code:** every score, the shop level, slow-job detection, and the car-days total.
- **Fallbacks:** if the AI is unavailable, the app shows the sample scorecard or sample fixes with a
  note, and Ask ShopStats answers its suggested questions directly from the numbers.

## Your data

- **Scorecard file:** sent from the server to OpenAI to read the numbers, held in memory only, never
  written to disk or a database. Requests use `store: false` so OpenAI doesn't keep the response for
  later retrieval (OpenAI's own retention policy for abuse monitoring still applies).
- **Jobs CSV:** read in the browser and never uploaded. Only the slow jobs' numbers (job ID, labor
  hours, days, supplements) are sent to OpenAI for the fix list and Ask ShopStats.
- **Results:** kept in the browser tab's session storage, cleared when the tab closes.

## Data

`data/scorecard.json` and `data/jobs.csv` describe **Valley Auto Body, a fictional shop** used for
demos. Worst-case test files live in `fixtures/worst-case/`.
