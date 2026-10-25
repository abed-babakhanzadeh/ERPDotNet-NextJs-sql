"use client";

import { use } from "react";
import ProductAttributeForm from "@/components/base-info/product-attribute/ProductAttributeForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductAttributePage({ params }: PageProps) {
  const { id } = use(params);
  return <ProductAttributeForm mode="edit" id={Number(id)} />;
}
