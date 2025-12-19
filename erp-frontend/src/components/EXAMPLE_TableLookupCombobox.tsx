// مثال استفاده مستقیم از TableLookupCombobox در هر جای صفحه:

import { useState, useCallback } from "react";
import {
  TableLookupCombobox,
  type ColumnDef,
} from "@/components/ui/TableLookupCombobox";
import apiClient from "@/services/apiClient";

interface Product {
  id: number;
  code: string;
  name: string;
  unitName: string;
  supplyType: string;
}

interface Unit {
  id: number;
  code: string;
  name: string;
}

export function Example() {
  // ============ Product Lookup ============
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const handleProductSearch = useCallback(async (searchTerm: string) => {
    setProductLoading(true);
    try {
      const response = await apiClient.post<any>("/Products/search", {
        pageNumber: 1,
        pageSize: 100,
        searchTerm: searchTerm || "",
        sortColumn: "code",
        sortDescending: false,
        Filters: [],
      });
      if (response?.data?.items) {
        setProducts(response.data.items);
      }
    } finally {
      setProductLoading(false);
    }
  }, []);

  const productColumns: ColumnDef[] = [
    { key: "code", label: "کد", width: "120px" },
    { key: "name", label: "نام", width: "200px" },
    { key: "unitName", label: "واحد", width: "100px" },
    { key: "supplyType", label: "نوع تامین", width: "150px" },
  ];

  // ============ Unit Lookup ============
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitLoading, setUnitLoading] = useState(false);

  const handleUnitSearch = useCallback(async (searchTerm: string) => {
    setUnitLoading(true);
    try {
      const response = await apiClient.post<any>("/Units/search", {
        pageNumber: 1,
        pageSize: 100,
        searchTerm: searchTerm || "",
      });
      if (response?.data?.items) {
        setUnits(response.data.items);
      }
    } finally {
      setUnitLoading(false);
    }
  }, []);

  const unitColumns: ColumnDef[] = [
    { key: "code", label: "کد", width: "150px" },
    { key: "name", label: "نام", width: "200px" },
  ];

  return (
    <div className="space-y-4">
      {/* Product Combobox */}
      <div>
        <label>انتخاب محصول:</label>
        <TableLookupCombobox<Product>
          value={selectedProduct}
          onValueChange={(id, product) => {
            setSelectedProduct(id as number);
            console.log("محصول انتخاب شد:", product);
          }}
          columns={productColumns}
          items={products}
          loading={productLoading}
          placeholder="جستجو برای محصول..."
          searchableFields={["code", "name", "unitName"]}
          displayFields={["code", "name"]}
          onSearch={handleProductSearch}
        />
      </div>

      {/* Unit Combobox */}
      <div>
        <label>انتخاب واحد:</label>
        <TableLookupCombobox<Unit>
          value={selectedUnit}
          onValueChange={(id, unit) => {
            setSelectedUnit(id as number);
            console.log("واحد انتخاب شد:", unit);
          }}
          columns={unitColumns}
          items={units}
          loading={unitLoading}
          placeholder="جستجو برای واحد..."
          searchableFields={["code", "name"]}
          displayFields={["code", "name"]}
          onSearch={handleUnitSearch}
        />
      </div>
    </div>
  );
}
