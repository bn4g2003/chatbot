import { aiModels } from "@/lib/ai";
export async function GET() { return Response.json({ models: aiModels }); }
