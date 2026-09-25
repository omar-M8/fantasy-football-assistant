import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * PageHeaderProps defines the properties for the PageHeader component.
 *
 * @property {string} title - The main title to be displayed in the header.
 * @property {string} [description] - Optional description text to be displayed below the title.
 * @property {ReactNode} [children] - Optional additional content to be displayed in the header.
 */
type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/**
 * PageHeader component that displays a header section with a title, optional description, and optional additional content.
 *
 * @param {string} title - The main title to be displayed in the header.
 * @param {string} [description] - Optional description text to be displayed below the title.
 * @param {ReactNode} [children] - Optional additional content to be displayed in the header.
 * @returns {JSX.Element} A header element containing the title, description, and any additional content.
 */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-2">{description}</p>}
      </div>
      {children && <div className={cn("flex items-center sm:justify-end")}>{children}</div>}
    </header>
  );
}
