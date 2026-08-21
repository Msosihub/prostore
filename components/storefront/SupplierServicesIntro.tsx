import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Fence,
  // Flame,
  // Network,
  ShieldCheck,
  // Sun,
  // Zap,
  DoorOpen,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type Locale = "en" | "sw";

type ServiceItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type SupplierProfile = {
  eyebrow: string;
  title: string;
  description: string;
  highlightedText: string;
  services: ServiceItem[];
};

const profiles: Record<string, SupplierProfile> = {
  hikvisiontz: {
    eyebrow: "Suluhisho za Usalama kwa Nyumba na Biashara",

    title:
      "Linda Nyumba au Biashara Yako kwa Mfumo Sahihi wa Usalama — Kuanzia Vifaa Hadi Ufungaji.",

    description:
      "Tunakuwezesha kupata vifaa sahihi vya usalama pamoja na ushauri na ufungaji wa kitaalamu. Tunahudumia nyumba, ofisi, maduka, maghala, taasisi na maeneo ya biashara.",

    highlightedText:
      "Usinunue vifaa bila uhakika. Tunaweza kukusaidia kuchagua mfumo unaofaa eneo lako, mahitaji yako na bajeti yako.",

    services: [
      {
        title: "CCTV Camera",
        description:
          "Linda mali yako kwa kamera za kisasa za ulinzi na ufuatiliaji kwa nyumba, biashara na taasisi.",
        icon: Camera,
      },
      {
        title: "Electric Fence",
        description:
          "Ongeza ulinzi wa eneo lako kwa uzio wa umeme unaosaidia kuzuia uvamizi na kuongeza usalama wa mali yako.",
        icon: Fence,
      },
      {
        title: "Gate Motor",
        description:
          "Fungua na kufunga geti lako kwa urahisi na usalama kwa kutumia mfumo wa kisasa wa gate automation.",
        icon: DoorOpen,
      },
      {
        title: "Ufungaji na Matengenezo",
        description:
          "Tunafanya installation, configuration, troubleshooting na matengenezo ya mifumo yako ya usalama.",
        icon: Wrench,
      },
    ],
  },

  tanzaniacctv: {
    eyebrow: "CCTV na Mifumo ya Usalama",

    title: "Pata CCTV na Mfumo Kamili wa Usalama Unaolingana na Mahitaji Yako.",

    description:
      "Tunasaidia wateja kupata vifaa sahihi vya CCTV na mifumo mingine ya usalama kwa nyumba, biashara, ofisi na taasisi pamoja na ufungaji wa kitaalamu.",

    highlightedText:
      "Tuambie eneo unalotaka kulinda, tukusaidie kuchagua vifaa sahihi na kupata makadirio ya mfumo unaokufaa.",

    services: [
      {
        title: "CCTV Camera",
        description:
          "Kamera za ndani na nje kwa ajili ya ulinzi wa nyumba, biashara, ofisi na maeneo mengine.",
        icon: Camera,
      },
      {
        title: "Electric Fence",
        description:
          "Suluhisho la ulinzi wa mipaka ya nyumba na biashara kwa kutumia uzio wa umeme.",
        icon: Fence,
      },
      {
        title: "Gate Motor",
        description:
          "Automate geti lako kwa mfumo wa gate motor unaorahisisha kuingia na kutoka kwa usalama zaidi.",
        icon: DoorOpen,
      },
      {
        title: "Ufungaji na Support",
        description:
          "Tunatoa ufungaji, configuration, troubleshooting na msaada wa kiufundi baada ya installation.",
        icon: Wrench,
      },
    ],
  },

  gammasuppliers: {
    eyebrow: "Vifaa na Suluhisho za Usalama",

    title: "Nunua Vifaa Sahihi na Pata Msaada wa Kitaalamu wa Ufungaji.",

    description:
      "Tunakuunganisha na vifaa vya usalama vinavyokufaa pamoja na huduma za ushauri, installation na matengenezo kwa nyumba na biashara.",

    highlightedText:
      "Badala ya kununua vifaa bila mpangilio, tunaweza kukusaidia kupata mfumo kamili unaofanya kazi pamoja kwa ufanisi.",

    services: [
      {
        title: "CCTV Camera",
        description:
          "Vifaa vya CCTV kwa ulinzi na ufuatiliaji wa nyumba, biashara na maeneo mbalimbali.",
        icon: Camera,
      },
      {
        title: "Electric Fence",
        description:
          "Uzio wa umeme kwa kuongeza ulinzi wa mipaka ya nyumba, biashara na maeneo ya taasisi.",
        icon: Fence,
      },
      {
        title: "Gate Motor",
        description:
          "Mifumo ya gate automation kwa matumizi ya nyumba, biashara na maeneo yenye mageti ya kuingia na kutoka.",
        icon: DoorOpen,
      },
      {
        title: "Ufungaji na Matengenezo",
        description:
          "Huduma za installation, configuration, maintenance na troubleshooting ya mifumo yako.",
        icon: Wrench,
      },
    ],
  },
};

function getDefaultProfile(): SupplierProfile {
  return {
    eyebrow: "Huduma za Usalama na Teknolojia",

    title: "Linda Nyumba au Biashara Yako kwa Mfumo Sahihi wa Usalama.",

    description:
      "Tunatoa vifaa, ushauri na huduma za ufungaji wa mifumo ya usalama kwa nyumba, biashara, ofisi, taasisi na maeneo mbalimbali.",

    highlightedText:
      "Tunaweza kukusaidia kuchagua vifaa sahihi, kupanga mfumo unaokufaa na kufanya ufungaji wa kitaalamu.",

    services: [
      {
        title: "CCTV Camera",
        description:
          "Mifumo ya kamera kwa ulinzi na ufuatiliaji wa nyumba, biashara, ofisi na taasisi.",
        icon: Camera,
      },
      {
        title: "Electric Fence",
        description:
          "Uzio wa umeme kwa kuongeza usalama wa mipaka ya nyumba na maeneo ya biashara.",
        icon: Fence,
      },
      {
        title: "Gate Motor",
        description:
          "Mfumo wa kufungua na kufunga geti kiotomatiki kwa urahisi na usalama zaidi.",
        icon: DoorOpen,
      },
      {
        title: "Ufungaji na Matengenezo",
        description:
          "Installation, configuration, troubleshooting na maintenance ya mifumo ya usalama.",
        icon: Wrench,
      },
    ],
  };
}

export default function SupplierServicesIntro({
  username,
}: {
  username: string;
  locale?: Locale;
}) {
  const normalizedUsername = username.trim().toLowerCase();

  const profile = profiles[normalizedUsername] ?? getDefaultProfile();

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {/* HERO */}
      <div className="relative overflow-hidden bg-slate-950 px-5 py-10 text-white sm:px-8 lg:px-12 lg:py-14">
        {/* Decorative gradients */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" />
            {profile.eyebrow}
          </div>

          <h1 className="max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl lg:leading-[1.08]">
            {profile.title}
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base lg:text-lg">
            {profile.description}
          </p>

          <div className="mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

            <p className="text-sm leading-6 text-slate-200">
              {profile.highlightedText}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#products"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Angalia Bidhaa na Bei
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="https://www.bmcontractorstz.com/services?lang=sw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Pata Ushauri wa Mfumo Sahihi
            </a>
          </div>
        </div>
      </div>

      {/* SERVICES */}
      <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Huduma Tunazokupa
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Pata Mfumo Kamili, Sio Vifaa Pekee
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Chagua vifaa unavyohitaji na upate msaada wa kitaalamu kwenye
            ushauri, ufungaji, configuration na matengenezo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {profile.services.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.title}
                className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="font-semibold text-slate-950">
                  {service.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
