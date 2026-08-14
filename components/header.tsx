"use client";
import Link from "next/link"; import { BookOpen, LogIn, Search, Shield, Sparkles, UserRound } from "lucide-react"; import { useSession } from "@/lib/auth-client"; import { ThemeToggle } from "./theme-toggle";
export function Header({ locale }: { locale: string }) { const { data } = useSession(); const role = (data?.user as ({ role?: string } & NonNullable<typeof data>["user"]) | undefined)?.role; return <header className="site-header"><div className="header-inner">
  <Link className="brand" href={`/${locale}`}><span className="brand-mark">L</span>Lorelia</Link>
  <nav><Link href={`/${locale}`}><BookOpen />{locale === "vi" ? "Khám phá" : "Discover"}</Link><Link href={`/${locale}/creator`}><Sparkles />Creator</Link>{role === "admin" && <Link href={`/${locale}/admin`}><Shield />Admin</Link>}</nav>
  <div className="header-actions"><Link className="icon-button" href={`/${locale}?search=1`} aria-label="Search"><Search /></Link><ThemeToggle />{data ? <Link className="avatar-button" href={`/${locale}/settings`}><UserRound /><span>{data.user.name}</span></Link> : <Link className="login-button" href={`/${locale}/auth`}><LogIn />{locale === "vi" ? "Đăng nhập" : "Sign in"}</Link>}</div>
</div></header>; }
