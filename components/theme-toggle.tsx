"use client";
import { Moon, Sun } from "lucide-react"; import { useTheme } from "next-themes";
export function ThemeToggle() { const { resolvedTheme, setTheme } = useTheme(); return <button suppressHydrationWarning className="icon-button" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />}</button>; }
