"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DocForm from "../../components/DocForm";
import inventoryService from "@/services/inventoryService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EditDocPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>(null);
  const [docTypes, setDocTypes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docRes, dtRes, wRes] = await Promise.all([
          inventoryService.getDocById(id),
          inventoryService.getAllDocTypes(),
          inventoryService.getAllWarehouses(),
        ]);
        setInitialData(docRes);
        setDocTypes(dtRes);
        setWarehouses(wRes);
      } catch (error) {
        toast.error("خطا در دریافت اطلاعات سند");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <DocForm
      mode="edit"
      initialData={initialData}
      docTypes={docTypes}
      warehouses={warehouses}
    />
  );
}
