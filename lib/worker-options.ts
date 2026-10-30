// Runtime callers (JS runners/config parsing) must not turn null/0/empty text
// into an execution request. Defaults are applied by each worker beforehand.
export function assertDryRun(dryRun: unknown): asserts dryRun is boolean {
  if (typeof dryRun !== "boolean") throw new Error("Invalid dry-run option");
}
