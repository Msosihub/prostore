// components/shared/nimboya-trust-block.tsx

import {
  ShieldCheck,
  BadgeCheck,
  PhoneCall,
  Building2,
  HandCoins,
  MessageCircleWarning,
} from "lucide-react";

export default function NimboyaTrustBlock({
  compact = false,
}: {
  compact?: boolean;
}) {
  const points = [
    {
      icon: HandCoins,
      title: "Malipo Salama",
      text: "Fedha yako inashikiliwa kwanza. Supplier halipwi mpaka uthibitishe kupokea mzigo.",
    },
    {
      icon: ShieldCheck,
      title: "Ulinzi wa Mnunuzi",
      text: "Ukipata tatizo, unaweza kuripoti kabla fedha haijatolewa kwa supplier.",
    },
    {
      icon: BadgeCheck,
      title: "Suppliers Wanaothibitishwa",
      text: "Tunafuatilia taarifa za wauzaji ili kupunguza hatari kwa wanunuzi.",
    },
    {
      icon: PhoneCall,
      title: "Msaada wa Haraka",
      text: "Unaweza kuwasiliana nasi kupitia 0760 111 880 kwa msaada wa order yako.",
    },
    {
      icon: Building2,
      title: "Kampuni Halisi",
      text: "Nimboya ina utambulisho wa biashara na mfumo wa kufuatilia order hatua kwa hatua.",
    },
    {
      icon: MessageCircleWarning,
      title: "Rahisi Kuripoti Tatizo",
      text: "Kama mzigo haujafika au una kasoro, usithibitishe delivery. Ripoti kwanza.",
    },
  ];

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-orange-50 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-emerald-100/70">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
          Nimboya Buyer Protection
        </p>
        <h3 className="mt-1 text-base sm:text-lg font-black text-slate-900 leading-tight">
          Nunua kwa Amani — Fedha yako inalindwa mpaka mzigo ufike
        </h3>
        {!compact && (
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Unapolipa kupitia Nimboya, supplier hapokei malipo moja kwa moja.
            Fedha inashikiliwa salama mpaka wewe uthibitishe kuwa umepokea
            bidhaa.
          </p>
        )}
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
              className="bg-white/80 border border-white rounded-xl p-3 flex gap-2.5 shadow-sm"
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
    </div>
  );
}
