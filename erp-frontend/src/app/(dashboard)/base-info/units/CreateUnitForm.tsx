"use client";

import { useState, useEffect } from "react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { Unit } from "@/types/baseInfo";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateUnitForm({ onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]); // برای پر کردن دراپ‌داون واحد پایه

  const [formData, setFormData] = useState({
    title: "",
    symbol: "",
    precision: 0,
    conversionFactor: 1,
    baseUnitId: "" as string | number // خالی یعنی واحد اصلی است
  });

  // دریافت لیست واحدها (برای انتخاب واحد پایه)
  useEffect(() => {
    apiClient.get<Unit[]>("/Units").then(res => setUnits(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // تبدیل baseUnitId خالی به null برای ارسال به سرور
      const payload = {
        ...formData,
        baseUnitId: formData.baseUnitId === "" ? null : Number(formData.baseUnitId)
      };

      await apiClient.post("/Units", payload);
      toast.success("واحد سنجش با موفقیت ایجاد شد");
      onSuccess();
    } catch (error: any) {
        // نمایش خطای ولیدیشن (FluentValidation) یا خطای عمومی
        const msg = error.response?.data?.errors 
            ? Object.values(error.response.data.errors).flat().join(" - ") 
            : "خطا در ثبت اطلاعات";
        toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">عنوان واحد</label>
          <input required placeholder="مثال: کیلوگرم" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نماد (انگلیسی)</label>
          <input required placeholder="kg" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تعداد اعشار</label>
          <input type="number" min="0" max="5" value={formData.precision} onChange={e => setFormData({...formData, precision: Number(e.target.value)})} className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
        </div>
        
        {/* انتخاب واحد پایه */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">واحد پایه (اختیاری)</label>
          <select 
            value={formData.baseUnitId} 
            onChange={e => setFormData({...formData, baseUnitId: e.target.value})} 
            className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none bg-white"
          >
            <option value="">--- این یک واحد اصلی است ---</option>
            {units.map(u => (
                <option key={u.id} value={u.id}>{u.title} ({u.symbol})</option>
            ))}
          </select>
        </div>
      </div>

      {/* اگر واحد پایه انتخاب شده باشد، ضریب را نشان بده */}
      {formData.baseUnitId !== "" && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
              <label className="block font-medium text-blue-800 mb-1">ضریب تبدیل</label>
              <div className="flex items-center gap-2">
                  <span>هر 1 {formData.title || "(واحد جدید)"} برابر است با</span>
                  <input 
                    type="number" 
                    step="0.001"
                    value={formData.conversionFactor} 
                    onChange={e => setFormData({...formData, conversionFactor: Number(e.target.value)})} 
                    className="w-24 rounded border border-blue-300 p-1 text-center font-bold" 
                  />
                  <span>{units.find(u => u.id == Number(formData.baseUnitId))?.title}</span>
              </div>
          </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">انصراف</button>
        <button disabled={loading} type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? "در حال ذخیره..." : "ثبت واحد"}
        </button>
      </div>
    </form>
  );
}