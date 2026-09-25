import * as React from "react";
import { cn } from "cn";

/**
 * Card component that serves as a container for content with customizable size and styling.
 *
 * @param {string} className - Additional class names to apply to the card.
 * @param {string} size - The size of the card (default or sm).
 * @param {object} props - Additional props to pass to the card component.
 * @returns {JSX.Element} A div element representing the card with the specified styles and behavior.
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm ring-1 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props} // Spread the remaining props
    />
  );
}

/**
 * CardHeader component that serves as the header section of the Card component.
 *
 * @param {string} className - Additional class names to apply to the card header.
 * @param {object} props - Additional props to pass to the card header component.
 * @returns {JSX.Element} A div element representing the card header with the specified styles and behavior.
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

/**
 * CardTitle component that serves as the title section of the Card component.
 *
 * @param {string} className - Additional class names to apply to the card title.
 * @param {object} props - Additional props to pass to the card title component.
 * @returns {JSX.Element} A div element representing the card title with the specified styles and behavior.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  );
}

/**
 *  CardDescription component that serves as the description section of the Card component.
 *
 * @param {string} className - Additional class names to apply to the card description.
 * @param {object} props - Additional props to pass to the card description component.
 * @param param0
 * @returns
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/**
 * CardAction component that serves as the action section of the Card component.
 *
 * @param {string} className - Additional class names to apply to the card action.
 * @param {object} props - Additional props to pass to the card action component.
 * @returns {JSX.Element} A div element representing the card action with the specified styles and behavior.
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

/**
 * CardContent component that serves as the content section of the Card component.
 *
 * @param {string} className - Additional class names to apply to the card content.
 * @param {object} props - Additional props to pass to the card content component.
 * @returns {JSX.Element} A div element representing the card content with the specified styles and behavior.
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />
  );
}

/**
 * CardFooter component that serves as the footer section of the Card component.
 *
 * @param {string} className - Additional class names to apply to the card footer.
 * @param {object} props - Additional props to pass to the card footer component.
 * @returns {JSX.Element} A div element representing the card footer with the specified styles and behavior.
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "bg-muted/50 flex items-center rounded-b-xl border-t p-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
