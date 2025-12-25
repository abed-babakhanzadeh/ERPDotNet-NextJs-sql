"use client";

import { Unit } from "@/modules/base-info/units/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";

export interface ConversionRowUi {
  id?: number | null;
  alternativeUnitId: number | string;
  factor: number | string;
}

interface ProductConversionListProps {
  conversions: ConversionRowUi[];
  units: Unit[];
  mainUnitId: number | string;
  onChange: (newConversions: ConversionRowUi[]) => void;
  readOnly?: boolean;
}

export function ProductConversionList({
  conversions,
  units,
  mainUnitId,
  onChange,
  readOnly = false,
}: ProductConversionListProps) {
  const addRow = () => {
    onChange([...conversions, { id: null, alternativeUnitId: "", factor: 1 }]);
  };

  const removeRow = (index: number) => {
    const n = [...conversions];
    n.splice(index, 1);
    onChange(n);
  };

  const updateRow = (
    index: number,
    field: keyof ConversionRowUi,
    value: any
  ) => {
    const n = [...conversions];
    n[index] = { ...n[index], [field]: value };
    onChange(n);
  };

  const mainUnitTitle =
    units.find((u) => u.id == mainUnitId)?.title || "واحد اصلی";

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-sm">واحدهای فرعی و ضرایب تبدیل</h3>
        </div>
        {!readOnly && (
          <Button
            onClick={addRow}
            size="sm"
            variant="outline"
            className="gap-2 h-8"
            type="button"
          >
            <Plus size={14} /> افزودن واحد
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {conversions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            هنوز واحد فرعی تعریف نشده است.
          </div>
        ) : (
          conversions.map((row, index) => (
            <div
              key={index}
              className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-muted/40 p-3 rounded-lg border"
            >
              <select
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 ring-primary text-right"
                value={row.alternativeUnitId}
                disabled={readOnly}
                dir="rtl"
                onChange={(e) =>
                  updateRow(index, "alternativeUnitId", Number(e.target.value))
                }
              >
                <option value="">انتخاب واحد...</option>
                {units
                  .filter((u) => u.id != mainUnitId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title}
                    </option>
                  ))}
              </select>

              <span className="text-sm font-bold text-muted-foreground">=</span>

              <Input
                type="number"
                step="0.001"
                placeholder="ضریب"
                disabled={readOnly}
                className="w-24 h-9 text-center"
                value={row.factor}
                onChange={(e) => updateRow(index, "factor", e.target.value)}
              />

              <span className="text-xs text-muted-foreground min-w-[60px] font-medium text-right">
                {mainUnitTitle}
              </span>

              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(index)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 sm:mr-auto"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
