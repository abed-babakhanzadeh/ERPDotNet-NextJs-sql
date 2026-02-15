"use client";

import React, { useEffect, useState } from "react";
import DocForm from "../components/DocForm";
import inventoryService from "@/services/inventoryService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CreateDocPage() {
  const [loading, setLoading] = useState(true);
  const [docTypes, setDocTypes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dtRes, wRes] = await Promise.all([
          inventoryService.getAllDocTypes(), // متد باید در سرویس باشد
          inventoryService.getAllWarehouses(), // متد باید در سرویس باشد
        ]);
        setDocTypes(dtRes);
        setWarehouses(wRes);
      } catch (error) {
        toast.error("خطا در دریافت اطلاعات اولیه");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <span className="mr-2">در حال بارگذاری اطلاعات پایه...</span>
      </div>
    );
  }

  return <DocForm mode="create" docTypes={docTypes} warehouses={warehouses} />;
}
