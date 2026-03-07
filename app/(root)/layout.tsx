import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BottomNav from "@/components/customComponents/bottom-nav-main";
import Header from "@/components/shared/header";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 🔒 Not logged in → go to sign in
  // if (!session) {
  //   redirect("/sign-in");
  // }

  // 🧠 Logged in but not onboarded
  if (session && session.user?.name === "NO_NAME") {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl p-0 px-2 sm:px-1 lg:px-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
