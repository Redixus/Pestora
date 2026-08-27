import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminContext } from "@/lib/admin/data";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getAdminContext();
  return <AdminShell locale={locale}>{children}</AdminShell>;
}
