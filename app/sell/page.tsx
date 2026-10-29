import Link from "next/link";
import NoticePreference from "@/components/sellers/notice-preference";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { mySellerApplication } from "@/lib/seller-registration";
import { shopPath } from "@/lib/seller-registration-policy";
import { jsonLd, publicUrl } from "@/lib/storefront-seo";
import ApplicationForm from "@/components/sellers/application-form";
export const metadata = {
  title: "Sell on Nimboya | Create your seller shop",
  description:
    "Apply to sell on Nimboya. Manage your catalog, review orders and share your own shop link after approval.",
  alternates: { canonical: publicUrl("/sell") },
};
export const dynamic = "force-dynamic";
export default async function SellPage() {
  const session = await auth();
  const [existing, user] = await Promise.all([
    mySellerApplication(),
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true, phoneVerified: true },
        })
      : null,
  ]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-600">
        <Link href="/" className="underline">
          Home
        </Link>{" "}
        / <span aria-current="page">Sell on Nimboya</span>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: publicUrl("/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Sell on Nimboya",
                item: publicUrl("/sell"),
              },
            ],
          }),
        }}
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-800">
            Your business. Your shop.
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Bring your customers to Nimboya.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            A shareable home for your products, with catalog management, product
            conversations and order tools in one seller workspace.
          </p>
          <ol className="mt-8 space-y-5">
            {[
              "Verify your phone and submit the essentials.",
              "Our team reviews your application. Track the decision here.",
              "After approval, share your shop link and keep your catalog up to date.",
            ].map((text, i) => (
              <li key={text} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold">
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <Link href="/search" className="mt-8 inline-block underline">
            Explore the marketplace
          </Link>
        </section>
        <section
          className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8"
          aria-label="Seller application"
        >
          {existing ? (
            <>
              <h2 className="text-2xl font-semibold">{existing.name}</h2>
              <p className="mt-3 rounded-lg bg-slate-100 p-3">
                Application:{" "}
                <strong>
                  {existing.registration?.state ||
                    (existing.isVerified
                      ? "APPROVED"
                      : "Existing profile — awaiting verification")}
                </strong>
              </p>
              {existing.registration?.reviewReason && (
                <p className="mt-4">
                  Review note: {existing.registration.reviewReason}
                </p>
              )}
              <p className="mt-4 text-sm text-slate-600">
                Pending or rejected applications are not public shops. Approval
                is a review decision, not a guarantee about every product.
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <Link href="/supplier/profile/profile" className="underline">
                  Edit seller profile
                </Link>
                <Link href="/supplier/products" className="underline">
                  Manage products
                </Link>
                {existing.isVerified && (
                  <Link
                    href={shopPath(existing.username, existing.id)}
                    className="underline"
                  >
                    View public shop
                  </Link>
                )}
              </div>
              {existing.registration && (
                <NoticePreference enabled={existing.registration.smsConsent} />
              )}
              {existing.registration?.notices.map((n, i) => (
                <p key={i} className="mt-3 text-sm">
                  SMS {n.kind.toLowerCase()}: {n.state.toLowerCase()}
                  {n.state === "ACCEPTED"
                    ? " by provider (delivery not confirmed)"
                    : ""}
                </p>
              ))}
              <p className="mt-3 text-sm text-slate-600">
                Queued means waiting for the notification worker; it does not
                mean sent.
              </p>
            </>
          ) : !user ? (
            <>
              <h2 className="text-2xl font-semibold">
                Start with a verified phone
              </h2>
              <p className="my-4 text-slate-600">
                Sign in with an SMS code, then return here. Existing buyers can
                use the same account.
              </p>
              <Link
                href="/sign-in?callbackUrl=%2Fsell"
                className="inline-block rounded-lg bg-emerald-900 px-5 py-3 text-white"
              >
                Sign in to apply
              </Link>
            </>
          ) : user.role === "ADMIN" ? (
            <p>Use your admin workspace to review sellers.</p>
          ) : !user.phoneVerified ? (
            <p>
              Verify your phone using SMS sign-in before applying.{" "}
              <Link className="underline" href="/sign-in?callbackUrl=%2Fsell">
                Verify phone
              </Link>
            </p>
          ) : (
            <>
              <h2 className="mb-5 text-2xl font-semibold">
                Apply for your shop
              </h2>
              <ApplicationForm />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
