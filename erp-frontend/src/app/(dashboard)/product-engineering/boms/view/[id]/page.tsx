"use client";
import React from "react";
import { useParams } from "next/navigation";
import BOMForm from "../../BOMForm";
import { Loader2 } from "lucide-react";

export default function ViewBOMPage() {
  const params = useParams();

  // بررسی اینکه آیا پارامترها لود شده‌اند
  if (!params?.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const id = Number(params.id);

  // اگر پارامتر آمد ولی عدد نبود (مثلا حروف بود)
  if (isNaN(id)) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        شناسه نامعتبر است
      </div>
    );
  }

  return <BOMForm mode="view" bomId={id} />;
}
