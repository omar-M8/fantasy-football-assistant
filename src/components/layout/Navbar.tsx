"use client";

import { Activity, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Navigation links for the Navbar component
const navLinks = [
  { href: "/matchups", label: "Matchups" },
  { href: "/standings", label: "Standings" },
  { href: "/trades", label: "Trades" },
  { href: "/waivers", label: "Waivers" },
];

/**
 * Navbar component that displays the navigation bar of the application.
 * @returns {JSX.Element} A header element containing the navigation links.
 */
export function Navbar() {
  const pathname = usePathname();
  const [menuPathname, setMenuPathname] = useState<string | null>(null);
  const isMenuOpen = menuPathname === pathname;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 h-16 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/*  Logo and branding link to the home page */}
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <Activity aria-hidden="true" className="size-4" />
          </span>
          FF Assistant
        </Link>

        {/* Map Navigation links for the primary navigation */}
        <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-muted-foreground hover:text-foreground text-sm transition-colors",
                isActive(link.href) && "text-primary font-medium"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Button to enter league ID, visible on medium and larger screens */}
        <div className="hidden md:block">
          <Button asChild variant="outline" size="sm">
            <Link href="#league-id">Enter League ID</Link>
          </Button>
        </div>

        {/* Button to toggle the mobile navigation menu, visible on small screens */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setMenuPathname(isMenuOpen ? null : pathname)}
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>

      {/* Mobile navigation menu visible when menu is toggled */}
      {isMenuOpen && (
        <div className="bg-background border-b px-4 py-4 shadow-sm md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuPathname(null)}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm",
                  isActive(link.href) && "text-primary font-medium"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link href="#league-id">Enter League ID</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
