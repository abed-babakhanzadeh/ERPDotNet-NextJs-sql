"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { findMenuTrail } from "@/config/menuItems";

/** عنوان هدر بر اساس منو: «ماژول › صفحه» به‌جای متن ثابت */
export function PageHeading() {
  const pathname = usePathname();
  const trail = findMenuTrail(pathname);
  const crumbs = trail.length ? trail.map((t) => t.title) : ["داشبورد"];

  return (
    <nav aria-label="مسیر صفحه" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((title, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <ChevronLeft
                  className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:block"
                  aria-hidden
                />
              )}
              <li
                className={
                  last
                    ? "truncate font-semibold text-foreground"
                    : "hidden truncate text-muted-foreground sm:block"
                }
                aria-current={last ? "page" : undefined}
              >
                {title}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
