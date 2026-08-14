import { WandSparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { CreatorForm } from "@/components/creator-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CreatorPage({
  params,
}: PageProps<"/[locale]/creator">) {
  const { locale } = await params;
  if (!(await getSession())) redirect(`/${locale}/auth`);
  const vi = locale === "vi";
  return (
    <main className="creator-page">
      <header className="creator-page-header">
        <div>
          <p className="eyebrow">
            <WandSparkles />
            Creator Studio
          </p>
          <h1>
            {vi ? "Tạo một nhân vật đáng nhớ" : "Create a memorable character"}
          </h1>
          <p>
            {vi
              ? "Thiết kế tính cách, giọng nói và điểm bắt đầu cho một câu chuyện có thể phát triển."
              : "Design the persona, voice and opening for a story that can evolve."}
          </p>
        </div>
        <span className="draft-status">
          <i />
          {vi ? "Bản nháp mới" : "New draft"}
        </span>
      </header>
      <CreatorForm locale={locale} />
    </main>
  );
}
