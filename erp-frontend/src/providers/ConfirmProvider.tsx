"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** danger برای حذف و دور ریختن تغییرات */
  tone?: "default" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * دیالوگ تأیید مشترک برنامه به‌جای window.confirm.
 * `await confirm({...})` مقدار true یا false برمی‌گرداند.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    // اگر دیالوگی باز مانده باشد، آن را «انصراف» حساب می‌کنیم
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader className="sm:text-start">
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start sm:space-x-0">
            {/* طبق اصل یکپارچگی: «انصراف» سمت راست و اقدام اصلی سمت چپ (RTL) */}
            <AlertDialogCancel onClick={() => settle(false)} className="mt-0">
              {options?.cancelText ?? "انصراف"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={buttonVariants({
                variant: options?.tone === "danger" ? "destructive" : "default",
              })}
            >
              {options?.confirmText ?? "تأیید"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  // بیرون از Provider (مثلاً SSR) به دیالوگ مرورگر برمی‌گردیم تا رفتار نشکند
  return confirm ?? (async (o) => window.confirm(o.title));
}

/** متن یکسان دیالوگ دور ریختن تغییرات ذخیره‌نشده */
export const DISCARD_CHANGES: ConfirmOptions = {
  title: "تغییرات ذخیره نشده است",
  description: "اگر ادامه دهید، تغییراتی که در این فرم داده‌اید از بین می‌رود.",
  confirmText: "دور ریختن تغییرات",
  cancelText: "ماندن در فرم",
  tone: "danger",
};
