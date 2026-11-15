// Adapted from shadcn/ui's Base UI button (MIT), using the app's semantic color tokens.
import { Button as Primitive } from "@base-ui/react/button";
import { cn } from "@/lib/utils";
export function Button({
  className,
  variant = "outline",
  ...props
}: Primitive.Props & { variant?: "outline" | "primary" | "ghost" }) {
  return (
    <Primitive
      data-slot="button"
      className={cn("button", variant, className)}
      {...props}
    />
  );
}
