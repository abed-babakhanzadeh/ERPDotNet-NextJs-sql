"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Plus,
  GitMerge,
  ListChecks,
  CheckCircle2,
  CircleDot,
  ShieldCheck,
  Users,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { RolePicker } from "@/components/modules/workflow/RolePicker";
import StateSlaDialog from "@/components/modules/workflow/StateSlaDialog";
import { workflowService } from "@/services/workflowService";
import {
  ProcessDetailsDto,
  StateDto,
  TransitionDto,
  WorkflowRoleDto,
} from "@/types/workflow";
import { handleApiError } from "@/lib/error-handling";

/** نام فارسی موجودیت‌های قابل اتصال به گردش کار */
const TARGET_ENTITY_TITLES: Record<string, string> = {
  InventoryDocHeader: "سند انبار",
};

export default function ProcessDesignerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const processId = Number(resolvedParams.id);

  const [process, setProcess] = useState<ProcessDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [newState, setNewState] = useState({
    title: "",
    stateCode: "",
    type: 2,
  });
  const [newTransition, setNewTransition] = useState({
    fromStateId: "",
    toStateId: "",
    actionTitle: "",
    actionCode: "",
    buttonVariant: 1, // 🌟 مقدار پیش‌فرض شد 1 (معادل Default)
    roleIds: [] as string[],
  });

  // نقش‌ها برای انتخاب دسترسی دکمه‌ها
  const [roles, setRoles] = useState<WorkflowRoleDto[]>([]);
  const [editingRolesFor, setEditingRolesFor] = useState<TransitionDto | null>(
    null,
  );
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [editingSlaFor, setEditingSlaFor] = useState<StateDto | null>(null);

  useEffect(() => {
    workflowService
      .getRoles()
      .then(setRoles)
      .catch(() => toast.error("خطا در دریافت فهرست نقش‌ها"));
  }, []);

  const openRolesEditor = (transition: TransitionDto) => {
    setEditingRolesFor(transition);
    setEditingRoleIds(transition.roles.map((r) => r.id));
  };

  const handleSaveRoles = async () => {
    if (!editingRolesFor) return;
    try {
      setIsSubmitting(true);
      await workflowService.updateTransitionRoles(
        editingRolesFor.id,
        editingRoleIds,
      );
      toast.success("دسترسی دکمه به‌روزرسانی شد");
      setEditingRolesFor(null);
      loadProcessDetails();
    } catch (error: any) {
      handleApiError(error, "خطا در ذخیره دسترسی");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadProcessDetails = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getProcessDetails(processId);
      setProcess(data);
    } catch (error) {
      handleApiError(error, "خطا در دریافت جزئیات فرآیند");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcessDetails();
  }, [processId]);

  // هندلر ساخت مرحله جدید
  const handleCreateState = async () => {
    if (!newState.title || !newState.stateCode) {
      toast.error("لطفاً عنوان و کد مرحله را وارد کنید");
      return;
    }
    try {
      setIsSubmitting(true);
      await workflowService.createState({
        processVersionId: process!.activeVersionId,
        title: newState.title,
        stateCode: newState.stateCode.toUpperCase(),
        type: Number(newState.type),
      });
      toast.success("مرحله جدید اضافه شد");
      setIsStateModalOpen(false);
      setNewState({ title: "", stateCode: "", type: 2 });
      loadProcessDetails();
    } catch (error: any) {
      handleApiError(error, "خطا در ثبت مرحله");
    } finally {
      setIsSubmitting(false);
    }
  };

  // هندلر ساخت ارتباط (دکمه) جدید
  const handleCreateTransition = async () => {
    if (
      !newTransition.fromStateId ||
      !newTransition.toStateId ||
      !newTransition.actionTitle
    ) {
      toast.error("لطفاً مبدا، مقصد و عنوان دکمه را مشخص کنید");
      return;
    }
    try {
      setIsSubmitting(true);
      await workflowService.createTransition({
        processVersionId: process!.activeVersionId,
        fromStateId: Number(newTransition.fromStateId),
        toStateId: Number(newTransition.toStateId),
        actionTitle: newTransition.actionTitle,
        actionCode: newTransition.actionCode
          ? newTransition.actionCode.toUpperCase()
          : null,
        // 🌟 این خط جا افتاده بود و باعث ارور 500 می‌شد!
        buttonVariant: Number(newTransition.buttonVariant),
        roleIds: newTransition.roleIds,
      });
      toast.success("ارتباط جدید با موفقیت ایجاد شد");
      setIsTransitionModalOpen(false);
      setNewTransition({
        fromStateId: "",
        toStateId: "",
        actionTitle: "",
        actionCode: "",
        buttonVariant: 1,
        roleIds: [],
      });
      loadProcessDetails();
    } catch (error: any) {
      handleApiError(error, "خطا در ثبت ارتباط");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        در حال بارگذاری اطلاعات طراح...
      </div>
    );
  if (!process)
    return (
      <div className="p-8 text-center text-destructive">فرآیند یافت نشد.</div>
    );

  return (
    <div className="flex flex-col gap-6 p-4 max-w-[1400px] mx-auto">
      {/* هدر فرآیند */}
      <div className="flex items-center justify-between bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/workflow/designer")}
          >
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {process.title}
              </h1>
              <Badge variant="secondary" className="bg-primary/15 text-primary">
                v{process.activeVersionNumber}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              مربوط به: {TARGET_ENTITY_TITLES[process.targetEntityName] ?? "سند"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* پنل سمت راست: لیست مراحل (States) */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <ListChecks className="w-5 h-5 text-success" /> مراحل گردش کار
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsStateModalOpen(true)}
              className="bg-success hover:bg-success/90"
            >
              <Plus className="w-4 h-4 ml-1" /> افزودن مرحله
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-4">
              {process.states.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  هنوز مرحله‌ای تعریف نشده است.
                </p>
              ) : (
                process.states.map((state: StateDto) => (
                  <div
                    key={state.id}
                    className="flex items-center justify-between p-3 bg-muted border rounded-lg"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {state.title}
                      </span>
                      {state.slaHours && (
                        <span className="text-xs text-muted-foreground">
                          مهلت {state.slaHours} ساعت
                          {state.escalationRoleName &&
                            ` · ارجاع به ${state.escalationRoleName}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {state.type !== 3 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="سررسید و ارجاع"
                          aria-label={`سررسید مرحله ${state.title}`}
                          onClick={() => setEditingSlaFor(state)}
                        >
                          <Timer className="h-4 w-4" />
                        </Button>
                      )}
                      <Badge
                        variant={
                          state.type === 1
                            ? "default"
                            : state.type === 3
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {state.type === 1
                          ? "شروع"
                          : state.type === 3
                            ? "پایانی"
                            : "میانی"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* پنل سمت چپ: لیست ارتباطات و دکمه‌ها (Transitions) */}
        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <GitMerge className="w-5 h-5 text-primary" /> ارتباطات و دکمه‌ها
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsTransitionModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 ml-1" /> اتصال مراحل
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-4">
              {process.transitions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  هنوز هیچ دکمه یا ارتباطی تعریف نشده است.
                </p>
              ) : (
                process.transitions.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col p-3 bg-primary/5 border border-primary/15 rounded-lg relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-primary text-sm bg-primary/15 px-2 py-1 rounded">
                        دکمه: {t.actionTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CircleDot className="w-4 h-4 text-warning" />
                      <span>{t.fromStateTitle}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground mx-1" />
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>{t.toStateTitle}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-primary/15 pt-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {t.roles.length === 0 ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 font-normal"
                          >
                            <Users className="h-3 w-3" /> همه کاربران
                          </Badge>
                        ) : (
                          t.roles.map((r) => (
                            <Badge
                              key={r.id}
                              variant="outline"
                              className="gap-1 font-normal"
                            >
                              <ShieldCheck className="h-3 w-3" /> {r.name}
                            </Badge>
                          ))
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRolesEditor(t)}
                      >
                        ویرایش دسترسی
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------- MODALS ----------------- */}

      {/* مودال ساخت مرحله */}
      <Dialog open={isStateModalOpen} onOpenChange={setIsStateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>افزودن مرحله جدید</DialogTitle>
            <DialogDescription className="sr-only">
              تنظیمات ایجاد مرحله جدید گردش کار
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>عنوان مرحله (فارسی)</Label>
              <Input
                placeholder="مثال: در انتظار تایید مدیر"
                value={newState.title}
                onChange={(e) =>
                  setNewState({ ...newState, title: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>کد مرحله (لاتین)</Label>
              <Input
                className="font-mono text-left"
                dir="ltr"
                placeholder="مثال: MANAGER_REVIEW"
                value={newState.stateCode}
                onChange={(e) =>
                  setNewState({ ...newState, stateCode: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>نوع مرحله</Label>
              <Select
                value={newState.type.toString()}
                onValueChange={(v) =>
                  setNewState({ ...newState, type: Number(v) })
                }
              >
                <SelectTrigger dir="rtl" aria-label="نوع وضعیت">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="1">شروع (نقطه ورود به کارتابل)</SelectItem>
                  <SelectItem value="2">میانی (بررسی و تاییدات)</SelectItem>
                  <SelectItem value="3">
                    پایانی (خروج از کارتابل/قطعی)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStateModalOpen(false)}
            >
              انصراف
            </Button>
            <Button onClick={handleCreateState} disabled={isSubmitting}>
              {isSubmitting ? "در حال ثبت..." : "ذخیره مرحله"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مودال ساخت دکمه (ارتباط) */}
      <Dialog
        open={isTransitionModalOpen}
        onOpenChange={setIsTransitionModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>اتصال مراحل (ساخت دکمه)</DialogTitle>
            <DialogDescription className="sr-only">
              تنظیمات اتصال دو مرحله و ایجاد دکمه کارتابل
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-warning">از مرحله (مبدا)</Label>
                <Select
                  value={newTransition.fromStateId}
                  onValueChange={(v) =>
                    setNewTransition({ ...newTransition, fromStateId: v })
                  }
                >
                  <SelectTrigger dir="rtl" aria-label="وضعیت مبدا">
                    <SelectValue placeholder="انتخاب مبدا..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {process.states.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-success">به مرحله (مقصد)</Label>
                <Select
                  value={newTransition.toStateId}
                  onValueChange={(v) =>
                    setNewTransition({ ...newTransition, toStateId: v })
                  }
                >
                  <SelectTrigger dir="rtl" aria-label="وضعیت مقصد">
                    <SelectValue placeholder="انتخاب مقصد..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {process.states.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 🌟 بخش اضافه شده: فیلد متن دکمه که جا افتاده بود */}
            <div className="grid gap-2 mt-2">
              <Label>متن دکمه برای کاربر</Label>
              <Input
                placeholder="مثال: تایید و ارجاع به مالی"
                value={newTransition.actionTitle}
                onChange={(e) =>
                  setNewTransition({
                    ...newTransition,
                    actionTitle: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid gap-2 mt-2">
              <Label>رنگ / نوع دکمه</Label>
              <Select
                value={newTransition.buttonVariant.toString()}
                onValueChange={(v) =>
                  setNewTransition({
                    ...newTransition,
                    buttonVariant: Number(v),
                  })
                }
              >
                <SelectTrigger dir="rtl" aria-label="رنگ دکمه">
                  <SelectValue placeholder="انتخاب رنگ دکمه..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="1">آبی (پیش‌فرض / ارجاع عادی)</SelectItem>
                  <SelectItem value="5">سبز (تایید نهایی / موفق)</SelectItem>
                  <SelectItem value="2">قرمز (رد / ابطال)</SelectItem>
                  <SelectItem value="3">توخالی (خنثی)</SelectItem>
                  <SelectItem value="4">خاکستری (ثانویه)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 mt-2">
              <Label>کد عملیات بک‌اند (Action Code) - اختیاری</Label>
              <Input
                className="font-mono text-left"
                dir="ltr"
                placeholder="مثال: INVENTORY_POST"
                value={newTransition.actionCode}
                onChange={(e) =>
                  setNewTransition({
                    ...newTransition,
                    actionCode: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                اگر این دکمه باید کدی در بک‌اند (مثل تغییر وضعیت سند یا کسر
                موجودی) اجرا کند، ActionCode مربوطه را بنویسید.
              </p>
            </div>
            <div className="grid gap-2 mt-2">
              <Label>نقش‌های مجاز به زدن این دکمه</Label>
              <RolePicker
                roles={roles}
                value={newTransition.roleIds}
                onChange={(roleIds) =>
                  setNewTransition({ ...newTransition, roleIds })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransitionModalOpen(false)}
            >
              انصراف
            </Button>
            <Button onClick={handleCreateTransition} disabled={isSubmitting}>
              {isSubmitting ? "در حال ثبت..." : "ذخیره ارتباط"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StateSlaDialog
        state={editingSlaFor}
        roles={roles}
        onClose={() => setEditingSlaFor(null)}
        onSaved={() => {
          setEditingSlaFor(null);
          loadProcessDetails();
        }}
      />

      {/* مودال ویرایش دسترسی دکمه */}
      <Dialog
        open={editingRolesFor !== null}
        onOpenChange={(open) => !open && setEditingRolesFor(null)}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              دسترسی دکمه «{editingRolesFor?.actionTitle}»
            </DialogTitle>
            <DialogDescription>
              فقط کاربرانی که یکی از نقش‌های انتخاب‌شده را دارند این دکمه را در
              کارتابل می‌بینند و می‌توانند اجرایش کنند.
            </DialogDescription>
          </DialogHeader>
          <RolePicker
            roles={roles}
            value={editingRoleIds}
            onChange={setEditingRoleIds}
            disabled={isSubmitting}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRolesFor(null)}>
              انصراف
            </Button>
            <Button onClick={handleSaveRoles} disabled={isSubmitting}>
              {isSubmitting ? "در حال ذخیره..." : "ذخیره دسترسی"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
