import { AdminCharacterEditor } from "@/components/admin-character-editor";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCharacterPage({ params }: PageProps<"/[locale]/admin/characters/[id]">) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session || session.user.role !== "admin") redirect(`/${locale}`);
  return <AdminCharacterEditor locale={locale} characterId={id} />;
}
