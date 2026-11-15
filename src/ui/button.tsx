import { Button as Primitive } from "@base-ui/react/button";
export function Button({
  className,
  variant = "outline",
  ...props
}: Omit<Primitive.Props, "className"> & {
  className?: string;
  variant?: "outline" | "primary" | "ghost";
}) {
  return (
    <Primitive
      data-slot="button"
      className={["button", variant, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
