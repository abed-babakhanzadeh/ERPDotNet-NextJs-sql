"use client";

import React, { use } from "react";
import ProductForm from "@/components/base-info/product/ProductForm";
import ProtectedPage from "@/components/ui/ProtectedPage";

interface PageProps {
  params: Promise<{ mode: string; id?: string[] }>;
}

export default function ProductPage({ params }: PageProps) {
  // آنباکس کردن پارامترها در Next.js 15
  const resolvedParams = use(params);

  const mode = resolvedParams.mode as "create" | "edit" | "view";

  // هندل کردن ID که به صورت آرایه می‌آید
  const productId = resolvedParams.id?.[0]
    ? Number(resolvedParams.id[0])
    : undefined;

  // بررسی اعتبار مود
  if (!["create", "edit", "view"].includes(mode)) {
    return <div>Invalid mode</div>;
  }

  // پرمیشن گارد بر اساس مود
  const requiredPermission =
    mode === "view"
      ? "BaseInfo.Products.View"
      : mode === "create"
        ? "BaseInfo.Products.Create"
        : "BaseInfo.Products.Edit";

  return (
    <ProtectedPage permission={requiredPermission}>
      <ProductForm mode={mode} productId={productId} />
    </ProtectedPage>
  );
}
