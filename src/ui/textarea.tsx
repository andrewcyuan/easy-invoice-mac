import * as React from "react";
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-slot="textarea"
    className={["input textarea", className].filter(Boolean).join(" ")}
    {...props}
  />
));
Textarea.displayName = "Textarea";
export { Textarea };
