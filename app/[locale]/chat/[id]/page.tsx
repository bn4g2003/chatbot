import { ChatRoom } from "@/components/chat-room"; import { getSession } from "@/lib/session"; import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ChatPage({ params }: PageProps<"/[locale]/chat/[id]">) { const { locale, id } = await params; if (!await getSession()) redirect(`/${locale}/auth?reason=chat`); return <main className="chat-page"><ChatRoom conversationId={id} locale={locale}/></main>; }
