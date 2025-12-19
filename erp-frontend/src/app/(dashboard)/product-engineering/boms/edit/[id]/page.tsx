"use client";
import React from "react";
import { useParams } from "next/navigation";
import BOMForm from "../../BOMForm";
import { Loader2 } from "lucide-react";

export default function EditBOMPage() {
  const params = useParams();

  if (!params?.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        شناسه نامعتبر است
      </div>
    );
  }

  return <BOMForm mode="edit" bomId={id} />;
}
