import { promises as fs } from "node:fs";
import path from "node:path";

import { seedFromSampleFiles } from "@/lib/store/seed";

/**
 * npm run seed                    load the sample workbooks into data/store.json
 * npm run seed -- --if-missing    only when there is no store yet (runs before dev)
 */
async function main() {
  if (process.argv.includes("--if-missing") && (await storeExists())) {
    console.log("data/store.json already exists — leaving it alone.");
    return;
  }

  const summary = await seedFromSampleFiles();
  console.log("Seeded data/store.json from public/*.xlsx");
  console.log(`  timesheet   ${summary.timesheetRows} rows`);
  console.log(`  salaries    ${summary.salaryRows} rows`);
  console.log(`  prices      ${summary.priceRows} rows`);
  console.log(`  months      ${summary.months.join(", ")}`);
}

async function storeExists() {
  try {
    await fs.access(path.join(process.cwd(), "data", "store.json"));
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
