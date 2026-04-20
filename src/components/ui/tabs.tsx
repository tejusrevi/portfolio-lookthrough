"use client";

import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{
  value: string;
  onValueChange: (v: string) => void;
}>({ value: "", onValueChange: () => {} });

function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const val = isControlled ? controlledValue : uncontrolled;
  const setVal = isControlled ? onValueChange! : setUncontrolled;

  return (
    <TabsContext.Provider value={{ value: val, onValueChange: setVal }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-6 border-b border-[var(--border)] pb-0",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  value,
  className,
  disabled,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const ctx = useContext(TabsContext);
  const isActive = ctx.value === value;

  return (
    <button
      className={cn(
        "inline-flex items-center whitespace-nowrap pb-2.5 text-sm font-medium tracking-wide uppercase transition-colors border-b-2 -mb-px",
        isActive
          ? "border-[var(--foreground)] text-[var(--foreground)]"
          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
        disabled && "pointer-events-none opacity-40",
        className
      )}
      onClick={() => ctx.onValueChange(value)}
      disabled={disabled}
      {...props}
    />
  );
}

function TabsContent({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;

  return <div className={cn("mt-6", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
