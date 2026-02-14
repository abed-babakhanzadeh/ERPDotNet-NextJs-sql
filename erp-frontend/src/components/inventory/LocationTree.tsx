"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderTree,
  Ban,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import inventoryService from "@/services/inventoryService";
import { LocationDto } from "@/types/inventory";
import LocationDialog from "./LocationDialog";

interface LocationTreeProps {
  warehouseId: number;
}

export default function LocationTree({ warehouseId }: LocationTreeProps) {
  // SWR برای دریافت و کش کردن دیتا
  const {
    data: locations,
    error,
    isLoading,
    mutate,
  } = useSWR(
    warehouseId ? `/api/inventory/locations/${warehouseId}` : null,
    () => inventoryService.getLocations(warehouseId),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedParent, setSelectedParent] = useState<LocationDto | null>(
    null,
  );
  const [selectedLocation, setSelectedLocation] = useState<LocationDto | null>(
    null,
  );

  // هندلر حذف
  const handleDelete = async (loc: LocationDto) => {
    if (!confirm(`آیا از حذف لوکیشن "${loc.title}" اطمینان دارید؟`)) return;

    try {
      await inventoryService.deleteLocation(loc.id, loc.rowVersion);
      toast.success("لوکیشن حذف شد");
      mutate(); // رفرش لیست
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در حذف");
    }
  };

  const openCreateRoot = () => {
    setDialogMode("create");
    setSelectedParent(null);
    setSelectedLocation(null);
    setDialogOpen(true);
  };

  const openCreateChild = (parent: LocationDto) => {
    setDialogMode("create");
    setSelectedParent(parent);
    setSelectedLocation(null);
    setDialogOpen(true);
  };

  const openEdit = (loc: LocationDto) => {
    setDialogMode("edit");
    setSelectedParent(null); // در ادیت از خود دیتا خوانده می‌شود
    setSelectedLocation(loc);
    setDialogOpen(true);
  };

  if (error) return <div className="text-red-500">خطا در دریافت اطلاعات</div>;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          ساختار فیزیکی و قفسه‌بندی
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button onClick={openCreateRoot} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            افزودن ریشه جدید
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">عنوان ساختار</TableHead>
              <TableHead>کد</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // نمایش اسکلتون لودینگ
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : locations && locations.length > 0 ? (
              locations.map((loc: LocationDto) => (
                <TableRow key={loc.id} className="group hover:bg-muted/50">
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingRight: `${loc.level * 24}px` }} // ایندنت هوشمند
                    >
                      {/* نمایش آیکون خط اتصال درختی */}
                      {loc.level > 0 && (
                        <div className="w-4 border-b-2 border-r-2 border-muted-foreground/30 h-4 rounded-br-none -mt-2 ml-1" />
                      )}
                      <span className="font-medium text-sm truncate">
                        {loc.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {loc.code}
                  </TableCell>
                  <TableCell>
                    {loc.isBlocked ? (
                      <Badge
                        variant="destructive"
                        className="gap-1 text-[10px]"
                      >
                        <Ban className="h-3 w-3" /> مسدود
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 text-[10px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                      >
                        <CheckCircle2 className="h-3 w-3" /> فعال
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openCreateChild(loc)}>
                          <Plus className="ml-2 h-4 w-4" />
                          افزودن زیرمجموعه
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(loc)}>
                          <Pencil className="ml-2 h-4 w-4" />
                          ویرایش مشخصات
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(loc)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  هیچ لوکیشنی تعریف نشده است.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LocationDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => mutate()} // رفرش خودکار بعد از موفقیت
        warehouseId={warehouseId}
        mode={dialogMode}
        parentLocation={selectedParent}
        editData={selectedLocation}
        allLocations={locations || []} // پاس دادن کل لیست برای انتخاب والد
      />
    </div>
  );
}
