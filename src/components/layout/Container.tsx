import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ContainerProps defines the properties for the Container component.
 *
 * @property {ReactNode} children - The content to be wrapped inside the container.
 * @property {string} [className] - Optional additional class names to apply to the container.
 */
type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Container component that centers its children and applies responsive padding.
 *
 * @param {ReactNode} children - The content to be wrapped inside the container.
 * @param {string} [className] - Optional additional class names to apply to the container.
 * @returns {JSX.Element} A div element that wraps the children with specified styles.
 */
export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
  );
}
