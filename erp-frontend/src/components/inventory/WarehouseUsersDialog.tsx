"use client";

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import inventoryService from "@/services/inventoryService";
import { handleApiError } from "@/lib/error-handling";
import type { WarehouseUserDto } from "@/types/api";

interface Props {
  warehouse: { id: number; title: string } | null;
  onClose: () => void;
}

/** کاربران مجاز انبار؛ کاربری که هیچ انباری ندارد به همه انبارها دسترسی دارد */
export default function WarehouseUsersDialog({ warehouse, onClose }: Props) {
  const [users, setUsers] = useState<WarehouseUserDto[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!warehouse) return;
    setLoading(true);
    setSearch("");
    inventoryService
      .getWarehouseUsers(warehouse.id)
      .then((rows) => {
        setUsers(rows);
        setSelected(rows.filter((u) => u.isAllowed).map((u) => u.id));
      })
      .catch((error) => handleApiError(error, "خطا در دریافت کاربران"))
      .finally(() => setLoading(false));
  }, [warehouse]);

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );

  const term = search.trim();
  const visible = term
    ? users.filter(
        (u) => u.fullName.includes(term) || u.userName.includes(term),
      )
    : users;

  const submit = async () => {
    if (!warehouse) return;
    setSubmitting(true);
    try {
      await inventoryService.setWarehouseUsers(warehouse.id, selected);
      toast.success("کاربران مجاز انبار ذخیره شد");
      onClose();
    } catch (error) {
      handleApiError(error, "خطا در ذخیره دسترسی");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!warehouse} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            کاربران مجاز «{warehouse?.title}»
          </DialogTitle>
          <DialogDescription>
            کاربری که حداقل یک انبار به او تخصیص داده شده، فقط اسناد، موجودی و
            کاردکس همان انبارها را می‌بیند. کاربر بدون تخصیص و مدیر سیستم به همه
            انبارها دسترسی دارند.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="جستجوی کاربر..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="جستجوی کاربر"
        />
        <div className="max-h-72 overflow-y-auto rounded-md border p-2">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : visible.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              کاربری یافت نشد.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {visible.map((u) => {
                const id = `wh-user-${u.id}`;
                const checked = selected.includes(u.id);
                const others = u.assignedWarehouses - (u.isAllowed ? 1 : 0);
                return (
                  <li
                    key={u.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(v) => toggle(u.id, v === true)}
                    />
                    <Label
                      htmlFor={id}
                      className="flex flex-1 cursor-pointer items-center justify-between gap-2 font-normal"
                    >
                      <span>
                        {u.fullName || u.userName}{" "}
                        <span
                          className="text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          ({u.userName})
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {others > 0
                          ? `${others} انبار دیگر`
                          : checked
                            ? "فقط همین انبار"
                            : "بدون محدودیت"}
                      </span>
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            انصراف
          </Button>
          <Button onClick={submit} disabled={submitting || loading}>
            {submitting && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
            ذخیره دسترسی
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
