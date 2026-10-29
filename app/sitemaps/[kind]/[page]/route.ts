import {
  sitemapKinds,
  sitemapPaths,
  sitemapXml,
  sitemapHeaders,
  type SitemapKind,
} from "@/lib/catalog-sitemaps";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; page: string }> },
) {
  const { kind, page } = await params;
  if (!/^[1-9]\d{0,5}\.xml$/.test(page))
    return new Response("Not found", { status: 404 });
  const number = Number(page.slice(0, -4));
  if (kind === "pages")
    return number === 1
      ? new Response(sitemapXml(["/", "/categories", "/search", "/sell"]), {
          headers: sitemapHeaders,
        })
      : new Response("Not found", { status: 404 });
  if (!sitemapKinds.includes(kind as SitemapKind))
    return new Response("Not found", { status: 404 });
  const paths = await sitemapPaths(kind as SitemapKind, number);
  return paths.length
    ? new Response(sitemapXml(paths), { headers: sitemapHeaders })
    : new Response("Not found", { status: 404 });
}
