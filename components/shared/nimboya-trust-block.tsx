import { MessageCircle, PackageCheck, ClipboardList } from "lucide-react";
export default function NimboyaTrustBlock({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section
      aria-label="Maelezo ya ununuzi"
      className={`grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 ${compact ? "" : "sm:grid-cols-3"}`}
    >
      {[
        {
          Icon: MessageCircle,
          title: "Uliza muuzaji",
          text: "Tumia mazungumzo ya bidhaa kabla ya kuagiza.",
        },
        {
          Icon: ClipboardList,
          title: "Kagua agizo",
          text: "Hakikisha kiasi, bei na anwani kabla ya kuthibitisha malipo.",
        },
        {
          Icon: PackageCheck,
          title: "Fuatilia na uripoti",
          text: "Angalia hatua za bidhaa kwenye agizo. Ripoti tatizo kabla ya kuthibitisha kupokea.",
        },
      ].map(({ Icon, title, text }) => (
        <div key={title}>
          <Icon size={20} className="mb-2 text-emerald-800" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{text}</p>
        </div>
      ))}
    </section>
  );
}
