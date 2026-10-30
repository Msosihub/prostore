// Enable only with a separately approved catalog-only operational database cutover.
// This notice neither archives data nor changes accounting/authorization behavior.
export default function OperationalBookNotice() {
  if (process.env.NEXT_PUBLIC_CATALOG_RELAUNCH !== "true") return null;
  return (
    <aside
      aria-label="Operational records notice"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="mx-auto max-w-7xl">
        <strong>New operational records.</strong> Orders and balances shown here
        cover this new system only. Earlier orders, returns and balances remain
        separate; historical obligations have not been cancelled. Keep your
        earlier receipts.
      </p>
    </aside>
  );
}
