export interface ProductConversion {
  id: number;
  alternativeUnitId: number;
  alternativeUnitName?: string; // علامت سوال اضافه کردم چون ممکن است نال باشد
  factor: number;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  latinName?: string;
  unitId: number;
  unitName: string;
  supplyTypeId: number;
  supplyType: string;
  imagePath?: string;
  descriptions?: string;
  isActive: boolean; // این خط باعث رفع ارور دوم می‌شود
  conversions?: ProductConversion[];
  rowVersion: string;
}