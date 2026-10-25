"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User } from "@/types/user";
import { handleApiError } from "@/lib/error-handling";
import { userService, roleService } from "@/services/userAccessService";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  userToEdit?: User | null;
}

interface RoleOption {
  id: string;
  name: string;
}

export default function CreateUserForm({
  onSuccess,
  onCancel,
  userToEdit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    personnelCode: "",
    password: "",
    roles: ["User"],
    isActive: true,
  });

  // دریافت لیست نقش‌ها
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setAvailableRoles(await roleService.getAll());
      } catch (error) {
        handleApiError(error, "خطا در دریافت فهرست نقش‌ها");
      }
    };
    fetchRoles();
  }, []);

  // پر کردن فرم در حالت ویرایش
  useEffect(() => {
    if (userToEdit) {
      // دیباگ: بررسی کنید آیا نقش‌ها از لیست می‌آیند؟
      // console.log("User to Edit Roles:", userToEdit.roles);

      setFormData({
        firstName: userToEdit.firstName,
        lastName: userToEdit.lastName,
        username: userToEdit.username,
        email: userToEdit.email,
        personnelCode: userToEdit.personnelCode || "", // هندل کردن نال
        password: "",
        // اصلاح منطق: اگر نقش دارد خودش، اگر نه "User"
        roles:
          userToEdit.roles && userToEdit.roles.length > 0
            ? userToEdit.roles
            : ["User"],
        isActive: userToEdit.isActive,
      });
    }
  }, [userToEdit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value =
      e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setFormData({ ...formData, roles: selectedOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (userToEdit) {
        // *** اصلاح خطای 400 ***
        // باید ID و ConcurrencyStamp را هم بفرستیم تا با Command بک‌اند مچ شود
        const payload = {
          ...formData,
          id: userToEdit.id,
          concurrencyStamp: userToEdit.concurrencyStamp,
        };

        await userService.update(userToEdit.id, payload);
        toast.success("کاربر ویرایش شد");
      } else {
        await userService.create(formData);
        toast.success("کاربر جدید اضافه شد");
      }
      onSuccess();
    } catch (error) {
      handleApiError(error, "خطا در ذخیره کاربر");
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (roleName: string) => {
    const translations: Record<string, string> = {
      Admin: "مدیر سیستم",
      User: "کاربر عادی",
      Accountant: "حسابدار",
      WarehouseKeeper: "انباردار",
    };
    return translations[roleName] || roleName;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* سطر اول */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            نام
          </label>
          <input
            required
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full rounded-lg border border-border p-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            نام خانوادگی
          </label>
          <input
            required
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full rounded-lg border border-border p-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* سطر دوم */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            نام کاربری
          </label>
          <input
            required
            disabled={!!userToEdit}
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full rounded-lg border border-border p-2 text-sm disabled:bg-muted outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            کد پرسنلی
          </label>
          <input
            name="personnelCode"
            value={formData.personnelCode}
            onChange={handleChange}
            className="w-full rounded-lg border border-border p-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* ایمیل */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          ایمیل
        </label>
        <input
          required
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full rounded-lg border border-border p-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {/* انتخاب نقش */}
      <div className="grid grid-cols-1">
        <label className="block text-sm font-medium text-foreground mb-1">
          نقش‌های کاربری (چند انتخاب با Ctrl)
        </label>
        <select
          multiple
          name="roles"
          value={formData.roles}
          onChange={handleRoleChange}
          className="w-full rounded-lg border border-border p-2 text-sm h-28 outline-none focus:border-primary bg-background"
        >
          {availableRoles.map((role) => (
            <option key={role.id} value={role.name}>
              {getRoleDisplayName(role.name)}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          برای انتخاب چند مورد، کلید Ctrl (یا Command در مک) را نگه دارید.
        </p>
      </div>

      {/* سطر آخر: رمز عبور و فعال بودن */}
      <div className="grid grid-cols-2 gap-4 items-center">
        {!userToEdit && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              رمز عبور
            </label>
            <input
              required
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-border p-2 text-sm outline-none focus:border-primary"
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="w-4 h-4 text-primary rounded border-border focus:ring-ring"
          />
          <label
            htmlFor="isActive"
            className="text-sm text-foreground select-none"
          >
            حساب کاربری فعال باشد
          </label>
        </div>
      </div>

      {/* دکمه‌ها */}
      <div className="flex justify-end gap-3 mt-6 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg"
        >
          انصراف
        </button>
        <button
          disabled={loading}
          type="submit"
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading
            ? "در حال ذخیره..."
            : userToEdit
            ? "ویرایش کاربر"
            : "ثبت کاربر"}
        </button>
      </div>
    </form>
  );
}
