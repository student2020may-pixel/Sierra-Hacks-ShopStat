import "server-only";
import { readFileSync } from "fs";
import path from "path";
import fixesData from "@/data/sample-fixes.json";
import scorecardData from "@/data/scorecard.json";
import { detectOutliers } from "./anomaly";
import { parseJobsCsv } from "./csv";
import type { Fix, Scorecard } from "./types";

/** The demo data, computed exactly as the app computes it, for marketing previews (server only, at build time). */
export const sampleScorecard = scorecardData as Scorecard;
export const sampleFixes = fixesData as Fix[];

const parsed = parseJobsCsv(readFileSync(path.join(process.cwd(), "data", "jobs.csv"), "utf8"));
if (!parsed.ok) throw new Error(`data/jobs.csv: ${parsed.error}`);
export const sampleJobs = detectOutliers(parsed.jobs);
