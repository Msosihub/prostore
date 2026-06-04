// components/shared/nimboya-trust-block.tsx

import {
  ShieldCheck,
  BadgeCheck,
  PhoneCall,
  Building2,
  HandCoins,
  MessageCircleWarning,
  CheckCircle2,
} from "lucide-react";

export default function NimboyaTrustBlock({
  compact = false,
}: {
  compact?: boolean;
}) {
  const headlinePoints = [
    "Supplier halipwi mpaka uthibitishe delivery",
    "Fedha yako inalindwa na Nimboya",
    "Ukiwa na tatizo piga 0760 111 880",
  ];

  const points = [
    {
      icon: HandCoins,
      title: "Malipo Salama",
      text: "Unapolipa, fedha haendi moja kwa moja kwa supplier. Inasubiri mpaka uthibitishe kuwa mzigo umefika.",
    },
    {
      icon: ShieldCheck,
      title: "Ulinzi wa Mnunuzi",
      text: "Kama mzigo haujafika, umeharibika, au siyo uliyoagiza, usithibitishe delivery. Ripoti kwanza.",
    },
    {
      icon: BadgeCheck,
      title: "Suppliers Wanaothibitishwa",
      text: "Tunafuatilia taarifa za suppliers ili kuongeza usalama na kupunguza hatari kwa wanunuzi.",
    },
    {
      icon: PhoneCall,
      title: "Msaada wa Haraka",
      text: "Unaweza kuwasiliana nasi kupitia 0760 111 880 kwa msaada kuhusu order, malipo, au delivery.",
    },
    {
      icon: Building2,
      title: "Utambulisho wa Biashara",
      text: "Nimboya ni mfumo wa biashara wenye utambulisho, rekodi za orders, malipo, na mawasiliano.",
    },
    {
      icon: MessageCircleWarning,
      title: "Rahisi Kuripoti Tatizo",
      text: "Kila order inaweza kufuatiliwa. Ukiwa na changamoto, tunaweza kuona hatua za malipo na delivery.",
    },
  ];

  return (
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-orange-50 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-emerald-100/70">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
          Nimboya Buyer Protection
        </p>

        <h3 className="mt-1 text-base sm:text-lg font-black text-slate-900 leading-tight">
          Nunua kwa Amani — Fedha yako inalindwa mpaka mzigo ufike
        </h3>

        {!compact && (
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tunaweka mfumo wa kulinda mnunuzi: supplier hapokei malipo mpaka
            wewe uthibitishe kuwa bidhaa imefika salama.
          </p>
        )}

        <div
          className={
            compact
              ? "mt-3 space-y-1.5"
              : "mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2"
          }
        >
          {headlinePoints.map((point) => (
            <div
              key={point}
              className="flex items-start gap-2 rounded-xl bg-white/80 border border-white px-3 py-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug">
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-1 gap-2 p-3"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3 sm:p-4"
        }
      >
        {points.map((point) => {
          const Icon = point.icon;

          return (
            <div
              key={point.title}
              className="bg-white/85 border border-white rounded-xl p-3 flex gap-2.5 shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900">
                  {point.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  {point.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
