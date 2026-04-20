import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border border-[var(--foreground)] text-[var(--foreground)]",
        secondary: "border border-[var(--border)] text-[var(--muted)]",
        success: "border border-[var(--foreground)] text-[var(--foreground)]",
        destructive: "border border-[var(--accent)] text-[var(--accent)]",
        outline: "border border-[var(--border)] text-[var(--muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
