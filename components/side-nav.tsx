"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Layers,
  Upload,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/productivity", label: "Productivity", icon: Users },
  { href: "/categories", label: "Categories", icon: Layers },
  { href: "/upload", label: "Data", icon: Upload },
];

export function SideNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The selected period follows the user between pages.
  const query = searchParams.toString();

  return (
    <nav className="flex gap-1 md:flex-col md:gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const target = href === "/upload" || !query ? href : `${href}?${query}`;

        return (
          <Link
            key={href}
            href={target}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
            <span className="hidden md:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <div className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md">
        <BarChart3 className="size-4" />
      </div>
      <div className="hidden md:block">
        <div className="text-sm leading-tight font-semibold">Margin</div>
        <div className="text-muted-foreground text-xs leading-tight">Agency economics</div>
      </div>
    </div>
  );
}
