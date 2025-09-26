import ProfileNav from "./profile-nav";

export default function SupplierLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="flex flex-col w-full">
        <div className="border-b container mx-auto ">
          <div className="flex items-center h-16 px-4">
            <ProfileNav className="mx-2" />
          </div>
        </div>

        <div className="flex-1 w-full space-y-4 p-0 pt-6 container mx-auto">
          {children}
        </div>
      </div>
    </>
  );
}
