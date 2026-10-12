import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function AdminPageHeader({
  eyebrow = "Centro de control",
  title,
  description,
  icon: Icon,
  actions,
  meta,
}: AdminPageHeaderProps) {
  return (
    <section className="admin-page-header">
      <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
        <div className="admin-page-icon" aria-hidden="true">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="admin-eyebrow">{eyebrow}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-[-.035em] text-white sm:text-[32px] sm:leading-none">
              {title}
            </h1>
            {meta}
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-[13px]">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
}

interface AdminToolbarProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function AdminToolbar({ children, label = "Filtros y búsqueda", className }: AdminToolbarProps) {
  return (
    <section className={cn("admin-toolbar", className)} aria-label={label}>
      <div className="admin-toolbar-label">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">{children}</div>
    </section>
  );
}

interface AdminEmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
}

export function AdminEmptyState({
  title,
  description = "Prueba ajustando los filtros o vuelve a intentarlo.",
  icon: Icon = Inbox,
  action,
  compact = false,
}: AdminEmptyStateProps) {
  return (
    <div className={cn("admin-empty-state", compact && "py-8")}>
      <div className="admin-empty-icon"><Icon className="h-5 w-5" /></div>
      <p className="mt-3 text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-center text-[11px] leading-relaxed text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface AdminStatProps {
  index: string;
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "gold" | "green" | "red" | "slate";
  caption?: string;
}

export function AdminStat({ index, label, value, icon: Icon, tone = "gold", caption }: AdminStatProps) {
  return (
    <div className={cn("admin-stat", `admin-stat-${tone}`)}>
      <div>
        <span className="admin-kpi-index">{index}</span>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">{label}</p>
      </div>
      <div className="admin-stat-icon"><Icon className="h-4 w-4" /></div>
      <p className="col-span-2 mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
      {caption && <p className="col-span-2 text-[10px] text-slate-500">{caption}</p>}
    </div>
  );
}
