export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Liveness only. Never implies database, provider or worker readiness.
export async function GET() {
  return Response.json(
    { status: "ok" },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
