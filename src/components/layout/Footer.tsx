import Link from "next/link";

/**
 *  Footer component that displays the footer section of the application.
 *
 * @returns {JSX.Element} A footer element containing copyright information and navigation links.
 */
export function Footer() {
  return (
    <footer className="text-muted-foreground border-t py-8 text-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 FF Assistant. Not affiliated with Sleeper.</p>
        <nav aria-label="Footer navigation" className="flex gap-4">
          <Link href="#" className="hover:text-foreground">
            GitHub
          </Link>
          <Link href="#" className="hover:text-foreground">
            Docs
          </Link>
        </nav>
      </div>
    </footer>
  );
}
