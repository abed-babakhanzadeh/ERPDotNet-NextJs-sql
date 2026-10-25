"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { WorkflowRoleDto } from "@/types/workflow";

interface RolePickerProps {
  roles: WorkflowRoleDto[];
  value: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
}

/** انتخاب نقش‌های مجاز یک دکمه گردش کار؛ هیچ انتخابی = همه کاربران */
export function RolePicker({ roles, value, onChange, disabled }: RolePickerProps) {
  const toggle = (roleId: string, checked: boolean) =>
    onChange(checked ? [...value, roleId] : value.filter((id) => id !== roleId));

  return (
    <div className="grid gap-2">
      <div className="max-h-48 overflow-y-auto rounded-md border p-2">
        {roles.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            نقشی تعریف نشده است.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {roles.map((role) => {
              const id = `role-${role.id}`;
              return (
                <div key={role.id} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={value.includes(role.id)}
                    onCheckedChange={(c) => toggle(role.id, c === true)}
                    disabled={disabled}
                  />
                  <Label htmlFor={id} className="cursor-pointer font-normal">
                    {role.name}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length === 0
          ? "هیچ نقشی انتخاب نشده؛ این دکمه برای همه کاربران فعال است."
          : `فقط کاربران با ${value.length} نقش انتخاب‌شده (و مدیر سیستم) این دکمه را می‌بینند.`}
      </p>
    </div>
  );
}
