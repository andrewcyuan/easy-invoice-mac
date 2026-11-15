import * as React from "react";
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      autoComplete="off"
      data-slot="input"
      className={["input", className].filter(Boolean).join(" ")}
      {...props}
    />
  ),
);
Input.displayName = "Input";
export { Input };
