"use client";

import { Plus, Trash2, Package, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Unit } from "@/types/baseInfo";
import { TableLookupCombobox } from "@/components/ui/TableLookupCombobox";

interface Conversion {
  unitId?: number | null; // ممکن است با نام‌های مختلف بیاید
  alternativeUnitId?: number | null;
  factor: number;
}

interface Props {
  units: Unit[];
  mainUnitId: number | null;
  conversions: Conversion[];
  setConversions: (val: Conversion[]) => void;
  isViewMode: boolean;
}

export default function ProductUnitsTab({
  units,
  mainUnitId,
  conversions,
  setConversions,
  isViewMode,
}: Props) {
  const addConversionRow = () => {
    setConversions([...conversions, { alternativeUnitId: null, factor: 1 }]);
  };

  const removeConversionRow = (index: number) => {
    const newRows = [...conversions];
    newRows.splice(index, 1);
    setConversions(newRows);
  };

  const updateConversionRow = (index: number, field: string, value: any) => {
    const newRows = [...conversions];
    // نرمال سازی نام فیلد (چون گاهی unitId است گاهی alternativeUnitId)
    const targetField = field === "unitId" ? "alternativeUnitId" : field;
    newRows[index] = { ...newRows[index], [targetField]: value };
    setConversions(newRows);
  };

  const mainUnitTitle =
    units.find((u) => u.id === mainUnitId)?.title || "واحد اصلی";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-5 h-5 text-blue-500" />
            واحدهای شمارش و ضرایب تبدیل
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            واحد اصلی کالا{" "}
            <span className="font-bold text-foreground mx-1">
              "{mainUnitTitle}"
            </span>{" "}
            است.
          </p>
        </div>
        {!isViewMode && (
          <Button
            onClick={addConversionRow}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={16} /> واحد فرعی جدید
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {conversions.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground">
            <Package className="w-10 h-10 mb-2 opacity-20" />
            <p>هیچ واحد فرعی تعریف نشده است.</p>
          </div>
        ) : (
          conversions.map((row, index) => {
            const currentUnitId = row.alternativeUnitId || row.unitId;
            return (
              <div
                key={index}
                className="flex flex-col md:flex-row items-end md:items-center gap-4 bg-muted/10 p-4 rounded-lg border border-muted-foreground/10"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center w-full">
                  {/* بخش 1: واحد فرعی */}
                  <div className="col-span-5">
                    <Label className="text-xs mb-1.5 block text-muted-foreground">
                      واحد فرعی
                    </Label>
                    <TableLookupCombobox
                      value={currentUnitId}
                      onValueChange={(val) =>
                        updateConversionRow(index, "alternativeUnitId", val)
                      }
                      items={units.filter((u) => u.id !== mainUnitId)}
                      columns={[{ key: "title", label: "عنوان" }]}
                      displayFields={["title"]}
                      placeholder="انتخاب واحد..."
                      disabled={isViewMode}
                    />
                  </div>

                  {/* بخش 2: متن رابط */}
                  <div className="col-span-1 flex justify-center pt-5">
                    <span className="text-lg font-bold text-muted-foreground">
                      =
                    </span>
                  </div>

                  {/* بخش 3: ضریب */}
                  <div className="col-span-3">
                    <Label className="text-xs mb-1.5 block text-muted-foreground">
                      تعداد / ضریب
                    </Label>
                    <Input
                      disabled={isViewMode}
                      type="number"
                      className="h-10 text-center font-bold text-lg"
                      value={row.factor}
                      onChange={(e) =>
                        updateConversionRow(
                          index,
                          "factor",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>

                  {/* بخش 4: واحد اصلی (فقط نمایش) */}
                  <div className="col-span-3 pt-6 md:pt-0">
                    <span className="text-sm font-medium bg-muted px-3 py-2 rounded-md block text-center w-full">
                      {mainUnitTitle}
                    </span>
                  </div>
                </div>

                {!isViewMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConversionRow(index)}
                    className="text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0"
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
