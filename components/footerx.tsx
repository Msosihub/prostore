import {
  Phone,
  MessageSquare,
  Instagram,
  Facebook,
  Mail,
  ArrowRight,
  Store,
  ShieldCheck,
  BadgeCheck,
  Star,
  Truck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const MarketplaceFooter = () => {
  const regions = [
    {
      city: "Dar es Salaam",
      points: [
        {
          name: "Arey Car Accessories",
          loc: "Kariakoo, Swahili/Twiga",
          tel: "718 793 087",
        },
        { name: "Brothers Sounds", loc: "Sinza Vatican", tel: "742 426 262" },
        { name: "Renny Digital", loc: "Makumbusho", tel: "698 033 581" },
      ],
    },
    {
      city: "Mikoa Mingine",
      points: [
        {
          name: "BM Car Accessories",
          loc: "Arusha, Mianzini",
          tel: "799 660 068",
        },
        { name: "Mrema Auto Spare", loc: "Dodoma Town", tel: "682 683 264" },
        {
          name: "BM Contractors",
          loc: "Moshi, Vijana St.",
          tel: "745 778 821",
        },
        { name: "iCare Technology", loc: "Mbeya, Kabwe", tel: "764 161 868" },
        { name: "Gyna Cakes", loc: "Mwanza City", tel: "743 386 332" },
      ],
    },
  ];

  // Mobile Money Logos (Ensure these paths exist in your public/images/payments/ folder)
  const paymentLogos = [
    { name: "M-Pesa", src: "/images/payments/mpesa.png" },
    { name: "TigoPesa", src: "/images/payments/mix.png" },
    { name: "Airtel Money", src: "/images/payments/airtel.png" },
    { name: "HaloPesa", src: "/images/payments/halopesa.png" },
  ];

  return (
    <footer className="bg-[#0f172a] text-gray-400 pt-16 pb-8 px-4 mb-16 sm:px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* 1. Pickpoint Network */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h3 className="text-white text-lg font-bold flex items-center gap-2 mb-1">
                <Truck className="w-5 h-5 text-blue-500" /> Vituo vya Mizigo
              </h3>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                Nimboya Delivery Network
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {regions.map((region) => (
                <div key={region.city} className="space-y-3">
                  <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider">
                    {region.city}
                  </h4>
                  <div className="space-y-4">
                    {region.points.map((pt, i) => (
                      <div
                        key={i}
                        className="border-l border-gray-800 pl-3 hover:border-blue-500 transition-colors"
                      >
                        <p className="text-sm font-bold text-gray-200">
                          {pt.name}
                        </p>
                        <p className="text-[11px] text-gray-500">{pt.loc}</p>
                        <a
                          href={`tel:+255${pt.tel}`}
                          className="text-[11px] text-blue-500 font-medium flex items-center gap-1 mt-1"
                        >
                          <Phone className="w-3 h-3" /> +255 {pt.tel}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Trust Hub with SVG Background */}
          <div className="lg:col-span-3 relative flex flex-col justify-center gap-6 py-10 lg:py-0 px-6 border-y lg:border-y-0 lg:border-x border-gray-800/50">
            {/* The SVG Map Background */}
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-5 pointer-events-none">
              <Image
                src="/images/tz.svg"
                alt="Tanzania Map"
                width={300}
                height={300}
                className="grayscale invert"
              />
            </div>

            <div className="relative z-10 space-y-5">
              <h3 className="text-white text-sm font-bold uppercase tracking-widest text-center mb-2">
                Usalama Wako
              </h3>

              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-500 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-100">
                    Malipo Salama (Escrow)
                  </p>
                  <p className="text-[10px] leading-relaxed">
                    Pesa inashikiliwa na Nimboya mpaka uhakikishe mzigo wako
                    kituoni.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BadgeCheck className="w-5 h-5 text-green-500 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-100">
                    Wauzaji Waliohakikiwa
                  </p>
                  <p className="text-[10px] leading-relaxed">
                    Kila supplier amekaguliwa leseni na eneo la biashara
                    (Physical Audit).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-yellow-500 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-100">
                    Ukaguzi wa Bidhaa
                  </p>
                  <p className="text-[10px] leading-relaxed">
                    Ruhusa ya kukagua ubora wa bidhaa kabla ya kukubali kupokea.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-white text-lg font-bold">Taarifa & Msaada</h3>
              <div className="flex flex-col gap-y-2 text-sm">
                <Link
                  href="/msaada/jinsi-ya-kununua"
                  className="hover:text-blue-400"
                >
                  Jinsi ya Kununua
                </Link>
                <Link
                  href="/msaada/jinsi-ya-kuuza"
                  className="hover:text-blue-400"
                >
                  Jinsi ya Kuuza
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Actions & Community */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <h3 className="text-white text-lg font-bold">Jiunge na Soko</h3>
              <Link
                href="/register/supplier"
                className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-blue-400 group-hover:text-white" />
                  <span className="font-bold text-sm text-white">
                    Fungua Duka (Supplier)
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>
              <Link
                href="/register/reseller"
                className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-green-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-green-400 group-hover:text-white" />
                  <span className="font-bold text-sm text-white">
                    Kuwa Reseller
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>
            </div>

            {/* Payment Method Logos */}
            <div className="pt-6 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest">
                Malipo Yanayokubalika
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                {paymentLogos.map((logo) => (
                  <div
                    key={logo.name}
                    className="bg-white/5 p-1.5 rounded-lg border border-white/10 hover:border-blue-500/50 transition-all"
                  >
                    <Image
                      src={logo.src}
                      alt={logo.name}
                      width={45}
                      height={25}
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-800 space-y-4">
              <div className="flex gap-4">
                <a
                  href="https://wa.me"
                  className="p-3 bg-gray-800 rounded-xl hover:bg-green-500 transition-colors text-white"
                >
                  <MessageSquare className="w-5 h-5" />
                </a>
                <a
                  href="https://instagram.com"
                  className="p-3 bg-gray-800 rounded-xl hover:bg-pink-600 transition-colors text-white"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://facebook.com"
                  className="p-3 bg-gray-800 rounded-xl hover:bg-blue-700 transition-colors text-white"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
              <div className="text-[13px]">
                <p className="text-gray-500 mb-1">Msaada / Barua pepe:</p>
                <a
                  href="mailto:nimboyatz@gmail.com"
                  className="text-white font-bold hover:text-blue-400 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-blue-500" /> nimboyatz@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-500 font-medium">
          <p>
            © {new Date().getFullYear()} Nimboya Marketplace. Kazi ya
            Watanzania.
          </p>
          <div className="flex gap-6 uppercase tracking-widest">
            <Link href="/terms" className="hover:text-white transition-colors">
              Masharti
            </Link>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Faragha
            </Link>
            <Link
              href="/contact"
              className="hover:text-white transition-colors"
            >
              Msaada
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MarketplaceFooter;
