"use client";

import { useFieldArray, Controller, Control } from "react-hook-form";
import { Trash2, Plus, Percent } from "lucide-react";
import { Input } from "../ui/input";
import { FormItem, FormLabel, FormControl, FormMessage } from "../ui/form";
import { Button } from "../ui/button";

interface PricingTiersFieldArrayProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>; // Binds seamlessly with parent schema structures
}

export default function PricingTiersFieldArray({
  control,
}: PricingTiersFieldArrayProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "pricingTiers",
  });

  return (
    <div className="w-full space-y-3">
      <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        <Percent className="w-3.5 h-3.5 text-orange-500" />
        Viwango vya Bei ya Jumla (Wholesale Pricing Tiers)
      </FormLabel>

      <div className="space-y-3 mt-1">
        {fields.map((fieldItem, index) => (
          <div
            key={fieldItem.id}
            className="grid grid-cols-[1fr,1fr,auto] gap-3 items-start bg-white p-3 border border-slate-100 rounded-xl shadow-sm animate-in fade-in duration-200"
          >
            {/* Min Qty Controller Input */}
            <Controller
              control={control}
              name={`pricingTiers.${index}.minQty` as const}
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[11px] font-semibold text-slate-600">
                    Kuanzia Idadi (Min Qty)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Mf. 10"
                      className="h-9 text-xs rounded-lg bg-slate-50/40 font-mono font-semibold"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Wholesale Unit Price Controller Input */}
            <Controller
              control={control}
              name={`pricingTiers.${index}.price` as const}
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[11px] font-semibold text-slate-600">
                    Bei kwa Kila Moja (TZS)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Mf. 150"
                      className="h-9 text-xs rounded-lg bg-slate-50/40 font-mono font-bold text-green-700"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Remove tier item row action button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-6 h-9 w-9 text-slate-400 hover:text-rose-600 active:bg-rose-50 rounded-lg transition-colors shrink-0"
              onClick={() => remove(index)}
              aria-label="Ondoa kiwango hiki cha bei"
            >
              <Trash2 className="h-4 h-4" />
            </Button>
          </div>
        ))}

        {/* Action Button Row: Bounded strictly to match your 3 wholesale tier limit configuration */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 select-none">
          {fields.length < 3 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ minQty: fields.length > 0 ? 5 : 2, price: 0 })
              }
              className="h-8 text-[11px] font-bold border-dashed border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/20 rounded-xl px-3 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Weka Kiwango cha Bei
            </Button>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium italic">
              Fikia kikomo cha viwango (Kiwango cha juu ni 3)
            </span>
          )}

          <div className="text-[10px] text-slate-400 leading-relaxed font-medium bg-slate-50 border border-slate-100/60 rounded-xl p-2.5 max-w-sm">
            Mfano mnunuaji atakavyoona ghalani: <br />
            <span className="font-mono bg-white px-1 py-0.5 rounded border text-slate-600 font-bold">
              1+ pcs → 200/=
            </span>{" "}
            ·{" "}
            <span className="font-mono bg-white px-1 py-0.5 rounded border text-slate-600 font-bold">
              5+ pcs → 150/=
            </span>{" "}
            ·{" "}
            <span className="font-mono bg-white px-1 py-0.5 rounded border text-slate-600 font-bold">
              10+ pcs → 100/=
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
