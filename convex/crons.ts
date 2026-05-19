import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.daily(
  "delete expired aliases",
  { hourUTC: 2, minuteUTC: 0 },
  internal.cleanup.deleteExpiredAliases,
);
export default crons;
