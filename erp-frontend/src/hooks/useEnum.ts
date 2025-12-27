import { useState, useEffect } from "react";
import { commonService, EnumItem } from "@/services/commonService";
import { toast } from "sonner";

export function useEnum(enumName: string) {
  const [items, setItems] = useState<EnumItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnum = async () => {
      try {
        const data = await commonService.getEnum(enumName);
        setItems(data);
      } catch (error) {
        console.error(`Error loading enum ${enumName}`, error);
        // toast.error("خطا در بارگذاری اطلاعات پایه");
      } finally {
        setLoading(false);
      }
    };

    fetchEnum();
  }, [enumName]);

  return { items, loading };
}
