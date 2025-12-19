export interface Unit {
  id: number;
  title: string;
  symbol: string;
  precision: number;      // جدید
  isActive: boolean;      // جدید
  baseUnitId?: number;    // جدید
  conversionFactor: number;
  baseUnitName?: string;
}