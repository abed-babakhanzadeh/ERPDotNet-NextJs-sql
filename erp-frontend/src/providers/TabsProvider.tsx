"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DISCARD_CHANGES, useConfirm } from "@/providers/ConfirmProvider";
import { findMenuTitleForPath, isInternalPath } from "@/lib/menu";

/** مسیر پیشخوان؛ تب ثابت و غیرقابل بستن نوار تب‌ها */
export const HOME_PATH = "/";

export interface Tab {
  id: string; // معمولا همان url است
  title: string;
  url: string;
}

interface TabsContextType {
  tabs: Tab[];
  activeTabId: string;
  addTab: (title: string, url: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  /** فرم داخل تب این را صدا می‌زند تا رفتن از تب با تغییرات ذخیره‌نشده تأیید بخواهد */
  setTabDirty: (id: string, dirty: boolean) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);
const STORAGE_KEY = "erp-tabs-state";

// Fallback context برای SSR
const defaultContextValue: TabsContextType = {
  tabs: [],
  activeTabId: "",
  addTab: () => {},
  closeTab: () => {},
  setActiveTab: () => {},
  setTabDirty: () => {},
};

function LoadingSkeleton() {
  return (
    <div className="flex items-center gap-2 h-12 px-2 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <div className="h-3 w-20 bg-muted rounded-full animate-pulse" />
      </div>
      <div className="flex gap-1">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 bg-muted rounded-t-md animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function TabsProviderContent({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  // تب‌هایی که فرم ذخیره‌نشده دارند؛ ref است چون تغییرش نباید رندر بگیرد
  const dirtyTabs = useRef(new Set<string>());

  const setTabDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyTabs.current.add(id);
    else dirtyTabs.current.delete(id);
  }, []);

  /** اگر تب تغییرات ذخیره‌نشده دارد، قبل از ترک آن تأیید می‌گیرد */
  const confirmLeave = useCallback(
    async (id: string) => {
      if (!dirtyTabs.current.has(id)) return true;
      const ok = await confirm(DISCARD_CHANGES);
      if (ok) dirtyTabs.current.delete(id);
      return ok;
    },
    [confirm]
  );

  // بررسی logout (حذف token) - بهینه‌شده بدون polling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        // کاربر logout کرد - تب‌ها را پاک کن
        localStorage.removeItem(STORAGE_KEY);
        setTabs([]);
        setActiveTabId("");
      }
    };

    // هنگام بارگذاری اول
    const token = localStorage.getItem("accessToken");
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
      setTabs([]);
      setActiveTabId("");
    }

    // گوش دادن به تغییرات storage (logout از تب دیگر)
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // بارگذاری تب‌ها از localStorage هنگام mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // بارگذاری فوری بدون delay برای بهتری بافی
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // داده localStorage قابل دستکاری است؛ فقط تب‌های سالم با مسیر داخلی پذیرفته می‌شوند
          const savedTabs: Tab[] = Array.isArray(parsed?.tabs)
            ? parsed.tabs.filter(
                (t: Partial<Tab>) =>
                  isInternalPath(t?.url) &&
                  t.url !== HOME_PATH &&
                  t.id === t.url &&
                  typeof t.title === "string",
              )
            : [];
          setTabs(savedTabs);
          setActiveTabId(isInternalPath(parsed?.activeTabId) ? parsed.activeTabId : "");
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setIsHydrated(true);
      setIsLoading(false);
    }
  }, []);

  // ذخیره تب‌ها در localStorage فقط هنگام تغییر واقعی
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      const state = JSON.stringify({ tabs, activeTabId });
      // تنها ذخیره کنید اگر واقعاً تغییر کرده باشد
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState !== state) {
        localStorage.setItem(STORAGE_KEY, state);
      }
    }
  }, [tabs, activeTabId, isHydrated]);

  // آخرین لیست تب‌ها برای callbackهایی که بعد از await اجرا می‌شوند (جلوگیری از state کهنه)
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // وقتی URL عوض شد (مثلاً router.push داخل فرم یا ورود مستقیم آدرس)، تب فعال را هماهنگ کن
  // و اگر برای این صفحه تبی نیست، از روی منو یک تب بساز تا همیشه تب فعال دیده شود
  useEffect(() => {
    if (!isHydrated) return;
    setActiveTabId(pathname);
    if (pathname === HOME_PATH) return;
    const title = findMenuTitleForPath(pathname);
    if (!title) return;
    setTabs((prev) =>
      prev.some((t) => t.id === pathname)
        ? prev
        : [...prev, { id: pathname, title, url: pathname }],
    );
  }, [pathname, isHydrated]);

  const addTab = useCallback(
    async (title: string, url: string) => {
      if (url !== activeTabId && !(await confirmLeave(activeTabId))) return;

      // ابتدا صفحه هدف را prefetch می‌کنیم تا سریع‌تر باز شود
      try {
        router.prefetch?.(url);
      } catch {
        // prefetch اختیاری است، خطا را لاگ نمی‌کنیم که تجربه کاربر خراب نشود
      }

      // پیشخوان تب ثابت نوار است و تب جداگانه نمی‌گیرد
      if (url !== HOME_PATH) {
        setTabs((prevTabs) =>
          prevTabs.some((t) => t.id === url)
            ? prevTabs
            : [...prevTabs, { id: url, title, url }],
        );
      }

      router.push(url);
      setActiveTabId(url);
    },
    [router, activeTabId, confirmLeave]
  );

  const closeTab = useCallback(
    async (id: string) => {
      if (!(await confirmLeave(id))) return;

      const current = tabsRef.current;
      const index = current.findIndex((t) => t.id === id);
      if (index === -1) return;
      const remaining = current.filter((t) => t.id !== id);
      setTabs(remaining);

      // فقط اگر تب فعال بسته شد جابه‌جا می‌شویم: تب کناری (مثل مرورگر)، وگرنه پیشخوان
      if (id === activeTabId) {
        const next = remaining[Math.min(index, remaining.length - 1)];
        const target = next?.url ?? HOME_PATH;
        setActiveTabId(target);
        router.push(target);
      }
    },
    [activeTabId, router, confirmLeave]
  );

  const setActiveTabHandler = useCallback(
    async (id: string) => {
      if (id !== activeTabId && !(await confirmLeave(activeTabId))) return;
      setActiveTabId(id);
      router.push(id);
    },
    [router, activeTabId, confirmLeave]
  );

  // فقط پس از hydration، context value را بفرستیم
  const contextValue = isHydrated
    ? {
        tabs,
        activeTabId,
        addTab,
        closeTab,
        setActiveTab: setActiveTabHandler,
        setTabDirty,
      }
    : defaultContextValue;

  // اگر در حال loading هست، loading skeleton نمایش بده
  if (isLoading) {
    return (
      <>
        <LoadingSkeleton />
        {children}
      </>
    );
  }

  return (
    <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>
  );
}

export function TabsProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <TabsProviderContent>{children}</TabsProviderContent>
    </Suspense>
  );
}

export const useTabs = () => {
  const context = useContext(TabsContext);
  // در صورت عدم وجود context (SSR یا خطا)، fallback کن
  if (!context) {
    // console.warn("useTabs: TabsProvider not found, returning default values");
    return defaultContextValue;
  }
  return context;
};
