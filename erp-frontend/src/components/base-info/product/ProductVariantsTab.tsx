"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Shapes } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PermissionGuard from "@/components/ui/PermissionGuard";
import { productService } from "@/services/baseInfoService";
import { handleApiError } from "@/lib/error-handling";
import type { ProductVariantDto } from "@/types/api";
import GenerateVariantsDialog from "./GenerateVariantsDialog";

interface Props {
  productId: number;
  isViewMode: boolean;
  /** اگر خود این کالا تنوع باشد */
  variantParent?: { id: number; name: string } | null;
}

/** تنوع‌های کالا (ترکیب ویژگی‌ها)؛ هر تنوع یک کالای مستقل است */
export default function ProductVariantsTab({ productId, isViewMode, variantParent }: Props) {
  const [variants, setVariants] = useState<ProductVariantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVariants(await productService.getVariants(productId));
    } catch (error) {
      handleApiError(error, "خطا در دریافت تنوع‌های کالا");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!variantParent) load();
  }, [load, variantParent]);

  if (variantParent) {
    return (
      <p className="text-sm text-muted-foreground">
        این کالا یکی از تنوع‌های{" "}
        <Link href={`/base-info/products/view/${variantParent.id}`} className="font-medium text-primary hover:underline">
          {variantParent.name}
        </Link>{" "}
        است و خودش تنوع ندارد.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Shapes className="h-4 w-4 text-primary" />
          تنوع‌های کالا
        </h3>
        {!isViewMode && (
          <PermissionGuard permission="BaseInfo.Products.Create">
            <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> ساخت تنوع
            </Button>
          </PermissionGuard>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : variants.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          این کالا هنوز تنوعی ندارد. با «ساخت تنوع» از ترکیب ویژگی‌ها (مثلاً رنگ و سایز) کالاهای مستقل بسازید.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>ویژگی‌ها</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <TableRow key={v.id}>
                  <TableCell dir="ltr" className="text-right font-mono text-xs">
                    <Link href={`/base-info/products/view/${v.id}`} className="text-primary hover:underline">
                      {v.code}
                    </Link>
                  </TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {v.values.map((value) => (
                        <Badge key={value} variant="secondary" className="font-normal">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {v.isActive ? (
                      <Badge className="bg-success hover:bg-success/90">فعال</Badge>
                    ) : (
                      <Badge variant="destructive">غیرفعال</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <GenerateVariantsDialog
        productId={productId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerated={load}
      />
    </div>
  );
}
