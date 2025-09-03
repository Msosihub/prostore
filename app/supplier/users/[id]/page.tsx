import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUserById } from "@/lib/actions/user.actions";
import UpdateUserForm from "./update-user-form";
import { requireSupplier } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Update User",
};

const SupplierUserUpdatePage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  await requireSupplier();

  const { id } = await props.params;

  const user_fetched = await getUserById(id);
  const user = {
    ...user_fetched,
    email: user_fetched.email ?? "<no email>",
  };

  if (!user) notFound();

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <h1 className="h2-bold">Update User</h1>
      <UpdateUserForm user={user} />
    </div>
  );
};

export default SupplierUserUpdatePage;
