import * as React from "react";
import { cn } from "@/lib/utils";
// Retains the upstream shadcn input API, with theme tokens instead of fixed slate colors.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      autoComplete="off"
      data-slot="input"
      className={cn("input", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
export { Input };
