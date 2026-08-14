import { AdminPanel } from "@/components/admin-panel";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  const session = await getSession();

  if (!session || session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  return (
    <main className="dashboard-page admin-full-page">
      <div className="dashboard-heading">
        <p className="eyebrow">Lorelia Control Room</p>
        <h1>{locale === "vi" ? "Trung tâm Quản trị Hệ thống" : "System Control Center"}</h1>
        <p>
          {locale === "vi"
            ? "Quản lý toàn diện người dùng, kiểm duyệt nhân vật, cấu hình AI và gói cước."
            : "Comprehensive management of users, character moderation, AI models, and subscriptions."}
        </p>
      </div>

      <AdminPanel locale={locale} />
    </main>
  );
}
