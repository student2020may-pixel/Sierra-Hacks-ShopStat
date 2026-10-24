import { readFile } from "fs/promises";
import path from "path";

// Serves data/jobs.csv so /jobs can run on sample data. Built once at build time.
export const dynamic = "force-static";

export async function GET() {
  const csv = await readFile(path.join(process.cwd(), "data", "jobs.csv"), "utf8");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
}
