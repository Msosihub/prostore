import BottomNav from "@/components/customComponents/bottom-nav-main";
import Header from "@/components/shared/header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl p-0 ">{children}</main>
      {/* <Footer /> */}
      <BottomNav />
    </div>
  );
}
