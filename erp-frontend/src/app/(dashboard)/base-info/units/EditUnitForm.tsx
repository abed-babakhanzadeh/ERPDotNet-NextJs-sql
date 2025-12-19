"use client";

import { useState, useEffect } from "react";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { Unit } from "@/types/baseInfo";

interface Props {
  unit: Unit; // دیتای ردیف انتخاب شده
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditUnitForm({ unit, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [unitsList, setUnitsList] = useState<Unit[]>([]);

  // استیت فرم با مقادیر اولیه از پراپس
  const [formData, setFormData] = useState({
    id: unit.id,
    title: unit.title,
    symbol: unit.symbol,
    precision: unit.precision,
    conversionFactor: unit.conversionFactor,
    baseUnitId: unit.baseUnitId ? String(unit.baseUnitId) : "",
    isActive: unit.isActive
  });

  // دریافت لیست واحدها برای دراپ‌داون
  useEffect(() => {
    apiClient.get<Unit[]>("/Units").then(res => setUnitsList(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        baseUnitId: formData.baseUnitId === "" ? null : Number(formData.baseUnitId)
      };

      // متد PUT برای ویرایش
      await apiClient.put(`/Units/${unit.id}`, payload);
      
      toast.success("واحد سنجش با موفقیت ویرایش شد");
      onSuccess();
    } catch (error: any) {
        const msg = error.response?.data?.errors 
            ? Object.values(error.response.data.errors).flat().join(" - ") 
            : "خطا در ویرایش اطلاعات";
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
          <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نماد</label>
          <input required value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تعداد اعشار</label>
          <input type="number" min="0" max="5" value={formData.precision} onChange={e => setFormData({...formData, precision: Number(e.target.value)})} className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">واحد پایه</label>
          <select 
            value={formData.baseUnitId} 
            onChange={e => setFormData({...formData, baseUnitId: e.target.value})} 
            className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none bg-white"
          >
            <option value="">--- این یک واحد اصلی است ---</option>
            {unitsList.filter(u => u.id !== unit.id).map(u => ( // خود واحد را از لیست حذف می‌کنیم تا سیکل نشود
                <option key={u.id} value={u.id}>{u.title} ({u.symbol})</option>
            ))}
          </select>
        </div>
      </div>

      {formData.baseUnitId !== "" && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
              <label className="block font-medium text-blue-800 mb-1">ضریب تبدیل</label>
              <div className="flex items-center gap-2">
                  <span>هر 1 {formData.title} برابر است با</span>
                  <input 
                    type="number" step="0.001"
                    value={formData.conversionFactor} 
                    onChange={e => setFormData({...formData, conversionFactor: Number(e.target.value)})} 
                    className="w-24 rounded border border-blue-300 p-1 text-center font-bold" 
                  />
                   <span>{unitsList.find(u => u.id == Number(formData.baseUnitId))?.title}</span>
              </div>
          </div>
      )}

      {/* وضعیت فعال/غیرفعال */}
      <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="isActive"
            checked={formData.isActive}
            onChange={e => setFormData({...formData, isActive: e.target.checked})}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">این واحد فعال است</label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">انصراف</button>
        <button disabled={loading} type="submit" className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
          {loading ? "در حال ویرایش..." : "ویرایش تغییرات"}
        </button>
      </div>
    </form>
  );
}