export interface Product {
  Descriptions: string;
  isActive: boolean;
  id: number;
  code: string;
  name: string;
  unitId: number;
  unitName: string;
  supplyTypeId: number;
  supplyType: string;
  imagePath?: string;
  conversions: ProductConversion[];
}

export interface ProductConversion {
  id: number;
  alternativeUnitId: number;
  alternativeUnitName: string;
  factor: number;
}
