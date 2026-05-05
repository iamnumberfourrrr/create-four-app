import { join } from "node:path";
import { register } from "../core/registry.js";
import type { Installer, FileOp, InstallerContext } from "../core/installer.js";

/**
 * shadcn/ui installer.
 * Requires tailwind=true in .four.json (gated at prompt level + defensive check here).
 * Drops static pinned copies of Button + Input components, cn() helper, components.json.
 * Appends CSS variables block (light+dark themes) to globals.css.
 */

const SHADCN_CSS_VARS = `
/* shadcn/ui CSS variables — light + dark themes */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}
`;

const BUTTON_TSX = `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
`;

const INPUT_TSX = `import * as React from "react";
import { cn } from "~/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
`;

const CN_APPEND = `
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, resolving conflicts via tailwind-merge. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
`;

const COMPONENTS_JSON =
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "default",
      rsc: false,
      tsx: true,
      tailwind: {
        config: "",
        css: "src/styles/globals.css",
        baseColor: "slate",
        cssVariables: true,
      },
      aliases: {
        components: "~/components",
        utils: "~/lib/utils",
        ui: "~/components/ui",
        lib: "~/lib",
        hooks: "~/hooks",
      },
    },
    null,
    2,
  ) + "\n";

const UI_README = `# components/ui

This directory contains shadcn/ui components.

Add more components with: \`pnpm dlx shadcn@latest add <component>\`
`;

const shadcnInstaller: Installer = {
  name: "shadcn",
  requires: ["tailwind"],

  install(ctx: InstallerContext): FileOp[] {
    const modules = ctx.modules as Record<string, unknown>;
    if (!modules["shadcn"]) return [];

    // Defensive gate: tailwind must be enabled
    if (!modules["tailwind"]) {
      throw new Error(
        "shadcn requires tailwind. Enable tailwind first (modules.tailwind must be true in .four.json).",
      );
    }

    const webDir = join("apps", "web");

    return [
      // components.json — shadcn registry config
      {
        kind: "write",
        path: join(webDir, "components.json"),
        content: COMPONENTS_JSON,
      },
      // cn() helper — appended to existing utils.ts (base template has a no-op placeholder)
      {
        kind: "append",
        path: join(webDir, "src", "lib", "utils.ts"),
        content: CN_APPEND,
      },
      // Button component (pinned static copy from shadcn registry)
      {
        kind: "write",
        path: join(webDir, "src", "components", "ui", "button.tsx"),
        content: BUTTON_TSX,
      },
      // Input component (pinned static copy from shadcn registry)
      {
        kind: "write",
        path: join(webDir, "src", "components", "ui", "input.tsx"),
        content: INPUT_TSX,
      },
      // README for ui dir
      {
        kind: "write",
        path: join(webDir, "src", "components", "ui", "README.md"),
        content: UI_README,
      },
      // Append CSS variables block to globals.css
      {
        kind: "append",
        path: join(webDir, "src", "styles", "globals.css"),
        content: SHADCN_CSS_VARS,
      },
      // Patch apps/web/package.json with shadcn deps
      {
        kind: "merge-json",
        path: join(webDir, "package.json"),
        patch: {
          dependencies: {
            clsx: "^2.1.1",
            "tailwind-merge": "^2.5.5",
            "class-variance-authority": "^0.7.1",
            "lucide-react": "^0.511.0",
            "@radix-ui/react-slot": "^1.2.3",
          },
        },
      },
    ];
  },
};

register(shadcnInstaller);

export { shadcnInstaller };
