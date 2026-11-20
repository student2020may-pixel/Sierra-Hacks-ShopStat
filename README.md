# ShopStats

ShopStats grades a repair estimate against a body shop's insurer scorecard: upload the scorecard, your
last cars, then any estimate, and see how that one job would move each scorecard metric.

Built by Ishaan Bhatnagar and Sidhak Makkar.

## Run it

```bash
npm install
cp .env.example .env   # then add your keys
npm run dev
```

- `OPENAI_API_KEY`: reads scorecards, job lists and estimates.
- `Gemini_API_Key_2`: backup when OpenAI fails or runs out of credits (`lib/ai.ts`).

Without either key the app still works on sample data, and each page says so. `.env` is gitignored, so
never commit it.

## Access

The whole app is private for now. `middleware.ts` sends anyone without the admin cookie to `/admin`,
where the access code (in `lib/admin.ts`, server only) sets a 7-day httpOnly cookie. API routes return
401 without it.

## Pipeline

| Page | What it does |
| --- | --- |
| `/assessment/scorecard` | **Step 1.** Pick an insurer (CSAA, GEICO, Travelers, Farmers; `lib/drp.ts`) and upload screenshots of its CCC dashboard: the main view and the KPI hover boxes. The AI reads only the insurer whose details are shown (not the summary rows for the others) and the numbers are merged into that slot, so nothing else is overwritten. Numbers can also be typed in. KPIs left blank are inactive for that insurer. |
| `/assessment/jobs` | **Step 2.** Upload your last cars: CSV or Excel (read in the browser), or a PDF, photo or screenshot (read by the AI). Flags jobs that took far longer than their labor hours predict. |
| `/assessment/estimate` | **Step 3.** Upload any estimate. The AI reads the repair lines and the insurer; it's graded against that DRP's scorecard (or one you pick). The grade and impact are computed in code. |
| `/mock-scorecard` | A fictional insurer scorecard for testing. |

## How an estimate is graded

[`lib/impact.ts`](lib/impact.ts) does the math; the AI only reads the estimate.

- **The KPI list:** [`lib/kpis.ts`](lib/kpis.ts) has all 42 KPIs on the CCC dashboard, each with its
  unit, which way is better, and whether it's set by the estimate (labor $, parts $, paint hours, repair
  % of sheet-metal labor, overwrite %...), predicted from it (days in the shop, supplements) or reference
  only (surveys, audits, process timing). Units and directions marked `confirmed: false` are guesses
  from the name; fix them there.
- **Which KPIs:** the estimate's insurer picks the DRP slot, and only that insurer's active KPIs are used.
  The repair-size cycle time KPIs only count an estimate whose total falls in their band.
- **This claim's numbers:** labor, parts, paint materials and misc dollars, paint and repair hours, and
  overrides come straight from the estimate.
  Days in the shop come from the line fitted to your last cars in step 2 (or a general rule without
  them), plus half a day per sublet. The chance of a supplement starts from your own past share of
  supplemented jobs and rises for preliminary estimates, signs of hidden damage and frame work.
- **Effect on the KPIs:** each KPI is an average over the insurer's claims, so with `n` claims this
  claim moves it to `(value × n + this claim) / (n + 1)`.
- **Grade:** how many of this job's own numbers meet the insurer's targets: all of them is an A, 75%+
  a B, 50%+ a C, 25%+ a D, below that an F.
- **Photo check (optional):** add up to 8 damage photos and they go to the AI with the estimate in
  one request. It lists damage it can see that no line covers ("missing"), lines for areas that look
  undamaged ("unsupported"), and repair-vs-replace calls the photos disagree with, each with its photo
  number and a severity. The photo accuracy grade is computed in code (missing items cost most), and
  each missed item raises the predicted chance of a supplement.
- **Ways to protect your score:** fixed rules (tear down first, order parts at teardown, offer
  alternate parts where allowed and disclosed). It never suggests cutting a needed repair.

## Your data

- **Files** are sent to OpenAI (or Gemini as a backup) only to read the numbers, held in memory, and
  never written to disk or a database. OpenAI requests use `store: false`.
- **Estimates and damage photos** aren't saved anywhere, not even in the browser. The AI is told to skip customer names,
  phone numbers, addresses, VINs and plates.
- **Scorecard and jobs results** stay in the browser tab's session storage, cleared when it closes.

## Data

`data/sample-scorecards.json` (also shown at `/mock-scorecard`), `data/jobs.csv`
and `data/sample-estimate.json` are fictional sample data, not real insurer numbers.
