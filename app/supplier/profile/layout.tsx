import ProfileNav from "./profile-nav";

export default function SupplierProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Dynamic Profile Nested Secondary Tracking Navigation Strip */}
      <div className="border-b border-slate-100 bg-white -mx-4 px-4 h-12 flex items-center select-none sticky top-16 z-20">
        <div className="w-full max-w-5xl mx-auto px-1">
          <ProfileNav />
        </div>
      </div>

      {/* Primary child content injection wrapper portal frame layout lines */}
      <div className="w-full max-w-5xl mx-auto px-1 pt-2">{children}</div>
    </div>
  );
}
