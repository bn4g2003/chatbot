"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
export function RemoteImage({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`image-fallback ${className}`}><ImageOff /><span>{alt}</span></div>;
  // Dynamic creator-provided URLs intentionally bypass Next image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
