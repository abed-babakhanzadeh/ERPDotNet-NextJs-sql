export interface Product {
  descriptions: string;
  isActive: boolean;
  id: number;
  code: string;
  name: string;
  latinName?: string;
  unitId: number;
  unitName: string;
  supplyTypeId: number;
  supplyType: string;
  imagePath?: string;
  conversions: ProductConversion[];
  rowVersion: string;
}

export interface ProductConversion {
  id: number;
  alternativeUnitId: number;
  alternativeUnitName: string;
  factor: number;
}
