"use client";

import { use } from "react";
import ProductCategoryForm from "@/components/base-info/product-category/ProductCategoryForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductCategoryPage({ params }: PageProps) {
  const { id } = use(params);
  return <ProductCategoryForm mode="edit" id={Number(id)} />;
}
