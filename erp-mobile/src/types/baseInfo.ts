export interface Unit {
    id: number;
    title: string;
    symbol: string;
    precision: number;
    isActive: boolean;
    baseUnitId?: number;
    conversionFactor?: number;
    baseUnitName?: string;
    rowVersion: string;
  }