"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Warehouse, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLookupCombobox } from "@/components/ui/TableLookupCombobox";

import inventoryService from "@/services/inventoryService";
import { Unit } from "@/types/baseInfo";
import { InventoryItemProfileDto } from "@/types/inventory";

const warehouseSettingSchema = z.object({
  warehouseId: z.coerce.number().min(1, "انبار الزامی است"),
  minStock: z.coerce.number().min(0),
  maxStock: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  defaultLocationId: z.coerce.number().optional().nullable(),
});

interface Props {
  productId: number;
  units: Unit[];
  isViewMode: boolean;
  // کالبک جدید برای اطلاع‌رسانی به والد
  onProfileUpdate?: (profile: InventoryItemProfileDto) => void;
}

export default function InventorySettingsTab({
  productId,
  units,
  isViewMode,
  onProfileUpdate,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<InventoryItemProfileDto | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [editingSettingId, setEditingSettingId] = useState<number | null>(null);

  const profileForm = useForm({
    defaultValues: {
      isBatchManaged: false,
      isSerialManaged: false,
      shelfLifeDays: 0,
      mainInventoryUnitId: 0,
    },
  });

  const settingForm = useForm<z.infer<typeof warehouseSettingSchema>>({
    resolver: zodResolver(warehouseSettingSchema),
    defaultValues: {
      warehouseId: 0,
      minStock: 0,
      maxStock: 0,
      reorderPoint: 0,
      defaultLocationId: null,
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [profileData, whList] = await Promise.all([
          inventoryService.getProductProfile(productId),
          inventoryService.getWarehouses({ pageNumber: 1, pageSize: 100 }),
        ]);

        setWarehouses(whList.items || []);

        if (profileData) {
          setProfile(profileData);
          // اطلاع به والد در بارگذاری اولیه
          if (onProfileUpdate) onProfileUpdate(profileData);

          profileForm.reset({
            isBatchManaged: profileData.isBatchManaged,
            isSerialManaged: profileData.isSerialManaged,
            shelfLifeDays: profileData.shelfLifeDays || 0,
            mainInventoryUnitId: profileData.mainInventoryUnitId,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [productId]);

  const onSaveProfile = async (values: any) => {
    try {
      await inventoryService.configureProductProfile({
        productId,
        ...values,
        mainInventoryUnitId: Number(values.mainInventoryUnitId),
      });
      toast.success("تنظیمات عمومی انبار ذخیره شد");

      // دریافت دیتای بروز شده
      const updated = await inventoryService.getProductProfile(productId);
      setProfile(updated);

      // === اطلاع‌رسانی به کامپوننت والد برای نمایش/مخفی کردن تب بچ ===
      if (onProfileUpdate && updated) {
        onProfileUpdate(updated);
      }
    } catch (error: any) {
      // نمایش خطای دقیق
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "خطا در ذخیره پروفایل";
      toast.error(msg);
    }
  };

  const onSaveSetting = async (
    values: z.infer<typeof warehouseSettingSchema>,
  ) => {
    try {
      await inventoryService.setWarehouseSetting({
        productId,
        ...values,
      });
      toast.success(
        editingSettingId
          ? "تنظیمات انبار بروزرسانی شد"
          : "تنظیمات انبار اضافه شد",
      );
      settingForm.reset({
        warehouseId: 0,
        minStock: 0,
        maxStock: 0,
        reorderPoint: 0,
        defaultLocationId: null,
      });
      setEditingSettingId(null);

      const updated = await inventoryService.getProductProfile(productId);
      setProfile(updated);
    } catch (error: any) {
      const msg = error.response?.data?.detail || "خطا در ذخیره تنظیمات انبار";
      toast.error(msg);
    }
  };

  const onEditSetting = (setting: any) => {
    setEditingSettingId(setting.id);
    settingForm.reset({
      warehouseId: setting.warehouseId,
      minStock: setting.minStock,
      maxStock: setting.maxStock,
      reorderPoint: setting.reorderPoint,
      defaultLocationId: setting.defaultLocationId,
    });
  };

  const onDeleteSetting = async (id: number, rowVersion: string) => {
    if (!confirm("آیا از حذف تنظیمات این انبار مطمئن هستید؟")) return;
    try {
      await inventoryService.deleteWarehouseSetting(id, rowVersion);
      toast.success("حذف شد");
      const updated = await inventoryService.getProductProfile(productId);
      setProfile(updated);
    } catch (error) {
      toast.error("خطا در حذف");
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. تنظیمات عمومی */}
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-orange-500" />
          تنظیمات عمومی انبارداری
        </h3>

        <Form {...profileForm}>
          <form
            id="product-profile-form"
            onSubmit={profileForm.handleSubmit(onSaveProfile)}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end"
          >
            <FormField
              control={profileForm.control}
              name="mainInventoryUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>واحد شمارش انبار</FormLabel>
                  <FormControl>
                    <TableLookupCombobox
                      value={field.value}
                      onValueChange={(val) => field.onChange(Number(val))}
                      items={units}
                      columns={[{ key: "title", label: "عنوان" }]}
                      displayFields={["title"]}
                      placeholder="انتخاب واحد انبار..."
                      disabled={isViewMode}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="shelfLifeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عمر قفسه‌ای (روز)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? 0}
                      disabled={isViewMode}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="isBatchManaged"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-x-reverse rounded-md border p-3 h-10 shadow-sm transition-colors hover:bg-muted/50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <div className="leading-none mr-2">
                    <FormLabel className="cursor-pointer font-medium">
                      مدیریت بچ (Batch)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="isSerialManaged"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-x-reverse rounded-md border p-3 h-10 shadow-sm transition-colors hover:bg-muted/50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <div className="leading-none mr-2">
                    <FormLabel className="cursor-pointer font-medium">
                      مدیریت سریال
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <button
              type="submit"
              id="submit-inventory-profile"
              className="hidden"
            />
          </form>
        </Form>
      </div>

      {/* 2. تنظیمات انبارها */}
      {profile && (
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">
            نقطه سفارش و موجودی در انبارها
          </h3>

          {!isViewMode && (
            <div
              className={`p-4 rounded-md mb-6 border border-dashed transition-colors ${editingSettingId ? "bg-orange-50 border-orange-200" : "bg-muted/30"}`}
            >
              <div className="text-xs font-bold mb-2 text-muted-foreground">
                {editingSettingId ? "ویرایش تنظیمات" : "افزودن تنظیمات جدید"}
              </div>
              <Form {...settingForm}>
                <form
                  onSubmit={settingForm.handleSubmit(onSaveSetting)}
                  className="flex flex-wrap gap-4 items-end"
                >
                  <FormField
                    control={settingForm.control}
                    name="warehouseId"
                    render={({ field }) => (
                      <FormItem className="min-w-[200px] flex-1">
                        <FormLabel className="text-xs">انبار</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={
                            field.value ? field.value.toString() : undefined
                          }
                          disabled={!!editingSettingId}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="انتخاب انبار" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id.toString()}>
                                {w.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingForm.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem className="w-[120px]">
                        <FormLabel className="text-xs">حداقل</FormLabel>
                        <Input
                          type="number"
                          className="h-9 text-center"
                          {...field}
                          value={field.value ?? 0}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingForm.control}
                    name="maxStock"
                    render={({ field }) => (
                      <FormItem className="w-[120px]">
                        <FormLabel className="text-xs">حداکثر</FormLabel>
                        <Input
                          type="number"
                          className="h-9 text-center"
                          {...field}
                          value={field.value ?? 0}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingForm.control}
                    name="reorderPoint"
                    render={({ field }) => (
                      <FormItem className="w-[120px]">
                        <FormLabel className="text-xs">نقطه سفارش</FormLabel>
                        <Input
                          type="number"
                          className="h-9 text-center"
                          {...field}
                          value={field.value ?? 0}
                        />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    {editingSettingId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9"
                        onClick={() => {
                          setEditingSettingId(null);
                          settingForm.reset({
                            warehouseId: 0,
                            minStock: 0,
                            maxStock: 0,
                            reorderPoint: 0,
                            defaultLocationId: null,
                          });
                        }}
                      >
                        انصراف
                      </Button>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      variant={editingSettingId ? "default" : "secondary"}
                      className="h-9 gap-1"
                    >
                      {editingSettingId ? (
                        <Save size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      {editingSettingId ? "بروزرسانی" : "افزودن"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نام انبار</TableHead>
                <TableHead className="text-center">حداقل موجودی</TableHead>
                <TableHead className="text-center">حداکثر موجودی</TableHead>
                <TableHead className="text-center">نقطه سفارش</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.warehouseSettings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground text-sm py-8"
                  >
                    تنظیماتی برای انبارها تعریف نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                profile.warehouseSettings.map((ws) => (
                  <TableRow
                    key={ws.id}
                    className={editingSettingId === ws.id ? "bg-muted/50" : ""}
                  >
                    <TableCell>{ws.warehouseTitle}</TableCell>
                    <TableCell className="text-center">
                      {ws.minStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {ws.maxStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-bold text-orange-600">
                      {ws.reorderPoint.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {!isViewMode && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                            onClick={() => onEditSetting(ws)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() =>
                              onDeleteSetting(ws.id, ws.rowVersion)
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
