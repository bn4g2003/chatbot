"use client";
import { useEffect } from "react";
export function ViewTracker({ slug }: { slug: string }) { useEffect(() => { void fetch(`/api/characters/${slug}/view`, { method: "POST" }); }, [slug]); return null; }
