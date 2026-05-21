"use client";

import { cn } from "@/lib/utils";
import { User, Store, ShieldCheck, Image, ChevronRight } from "lucide-react";

const links = [
  { id: "banner", title: "Bango & Logo", icon: User },
  { id: "business", title: "Taarifa za Duka", icon: Store },
  { id: "policies", title: "Sera za Biashara", icon: ShieldCheck },
  { id: "gallery", title: "Mkusanyiko wa Picha", icon: Image },
];

interface ProfileNavProps extends React.HTMLAttributes<HTMLElement> {
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}

export default function ProfileNav({
  className,
  activeSection,
  onSectionClick,
  ...props
}: ProfileNavProps) {
  const handleScrollToSection = (id: string) => {
    if (onSectionClick) {
      onSectionClick(id);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className={cn(
        "flex md:flex-col items-center md:items-start gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar w-full py-1",
        className
      )}
      {...props}
    >
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleScrollToSection(item.id)}
            className={cn(
              "flex items-center gap-2.5 px-3 h-10 text-xs font-semibold rounded-xl transition-all whitespace-nowrap w-full text-left outline-none",
              isActive
                ? "bg-slate-950 text-white font-bold shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 shrink-0",
                isActive ? "text-orange-500" : "text-slate-400"
              )}
            />
            <span className="flex-1">{item.title}</span>
            <ChevronRight
              className={cn(
                "w-3 h-3 text-slate-400 ml-auto hidden md:block transition-transform",
                isActive && "translate-x-0.5 text-white"
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
