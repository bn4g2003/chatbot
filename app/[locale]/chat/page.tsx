import { Clock, MessageCircle, MessageSquare, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RemoteImage } from "@/components/remote-image";
import { getSession } from "@/lib/session";
import { UserChatList } from "./user-chat-list";

export const dynamic = "force-dynamic";

export default async function MyChatsPage({
  params,
}: PageProps<"/[locale]/chat">) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/auth?reason=chat`);
  }

  const vi = locale === "vi";

  return (
    <main className="dashboard-page wide">
      <div className="dashboard-heading">
        <p className="eyebrow">
          <MessageSquare />
          {vi ? "Lịch sử tương tác" : "Conversation History"}
        </p>
        <h1>{vi ? "Các cuộc trò chuyện của bạn" : "My Conversations"}</h1>
        <p>
          {vi
            ? "Tất cả các đoạn chat cùng nhân vật được lưu giữ an toàn. Bạn có thể chọn để tiếp tục bất cứ lúc nào."
            : "All your character chats are preserved. Choose any session to continue your roleplay."}
        </p>
      </div>

      <UserChatList locale={locale} />
    </main>
  );
}
