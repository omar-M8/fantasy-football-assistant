"use client";

import * as React from "react";
import { cn } from "cn";
import { Separator as SeparatorPrimitive } from "radix-ui";

/**
 * Separator component that renders a horizontal or vertical separator line with customizable styles.
 *
 * @param {string} className - Additional class names to apply to the separator.
 * @param {string} orientation - The orientation of the separator (horizontal or vertical).
 * @param {boolean} decorative - If true, the separator is decorative and will not be announced by screen readers.
 * @param {object} props - Additional props to pass to the separator component.
 * @returns {JSX.Element} A div element representing the separator with the specified styles and behavior.
 */

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
