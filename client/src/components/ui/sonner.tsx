"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps, toast } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const ref = React.useRef<HTMLElement | null>(null);

  // Dismiss a toast when it is clicked
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const toastEl = target.closest(
        "[data-sonner-toast]"
      ) as HTMLElement | null;
      if (!toastEl) return;

      // Respect non-dismissible toasts
      if (
        toastEl.dataset.dismissible === "false" ||
        (target instanceof HTMLElement && target.dataset.dismissible === "false")
      )
        return;

      const indexAttr = toastEl.getAttribute("data-index");
      const index = indexAttr ? parseInt(indexAttr, 10) : NaN;
      const y = toastEl.getAttribute("data-y-position") || "";
      const x = toastEl.getAttribute("data-x-position") || "";
      const position = `${y}-${x}`;

      // Find the matching toast by index within the same position bucket
      const all = toast.getToasts();
      const defaultPos = (props.position as any) || "top-right";
      const group = all.filter(
        (t: any) => (t.position ?? defaultPos) === position
      );

      const clicked = Number.isFinite(index) ? group[index] : undefined;
      if (clicked && clicked.id != null) {
        toast.dismiss(clicked.id);
      } else if (group.length && group[0].id != null) {
        toast.dismiss(group[0].id);
      } else {
        // Fallback: dismiss most recent
        toast.dismiss();
      }
    };

    root.addEventListener("click", handleClick);
    return () => root.removeEventListener("click", handleClick);
  }, [props.position]);

  return (
    <Sonner
      ref={ref}
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
