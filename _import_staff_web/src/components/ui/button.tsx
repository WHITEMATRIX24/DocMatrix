import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(0,136,145,0.25)] hover:bg-[#00757d] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,136,145,0.32)] active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:-translate-y-0.5",
        outline:
          "border border-border bg-white text-[#111a1a] shadow-xs hover:border-primary hover:text-primary hover:bg-[#edf4f2]/40 hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground border border-[rgba(0,136,145,0.2)] hover:bg-primary hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,136,145,0.25)]",
        ghost: "text-[#475554] hover:bg-muted hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        pillTeal:
          "rounded-full bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(0,136,145,0.25)] hover:bg-[#00757d] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,136,145,0.32)] active:translate-y-0 font-semibold",
        pillOutline:
          "rounded-full border border-border bg-white text-[#111a1a] shadow-xs hover:border-primary hover:text-primary hover:bg-[#edf4f2]/40 hover:-translate-y-0.5 font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
