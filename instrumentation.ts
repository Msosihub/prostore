// This temporary rehearsal branch must not be merged into production.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { install } = await import("./scripts/hosted-staging-network.cjs");
    install();
  }
}
