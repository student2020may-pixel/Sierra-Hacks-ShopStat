# Worst-case inputs

Realistic bad files for regression-testing `/jobs` (upload each one on the page):

| File | What it checks |
| --- | --- |
| `jobs-quoted-export.csv` | Shop-system export: quoted fields with commas in names, CRLF line endings, extra columns, `RO Number` header |
| `jobs-semicolon.csv` | European Excel export: `;` delimiter and decimal commas (`12,5`) |
| `jobs-duplicates-long-ids.csv` | Duplicate job IDs and a long ID near the chart's right edge |
| `jobs-one-outlier.csv` | Exactly one flagged job (singular wording) |
| `jobs-too-few.csv` | Fewer than 5 jobs (friendly error) |
| `jobs-header-only.csv` | Header row, no jobs (friendly error) |
