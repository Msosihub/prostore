import { useFieldArray, Controller, Control } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Input } from "../ui/input";
import { FormItem, FormLabel, FormControl, FormMessage } from "../ui/form";
import { Button } from "../ui/button";
import { ProductFormValues } from "@/lib/validators";

type Props = {
  control: Control<ProductFormValues>;
};

export function PricingTiersFieldArray({ control }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "pricingTiers",
  });

  return (
    <div>
      <FormLabel>Viwango vya bei (kulingana na idadi)</FormLabel>

      <div className="space-y-3 mt-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-[1fr,1fr,auto] gap-3 items-start"
          >
            {/* Min Qty */}
            <Controller
              control={control}
              name={`pricingTiers.${index}.minQty` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Min Qty</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
            <Controller
              control={control}
              name={`pricingTiers.${index}.price` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remove row */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-7"
              onClick={() => remove(index)}
              aria-label="Remove tier"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Add row (max 3) */}
        {fields.length < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ minQty: 1, price: 0 })}
          >
            + Add Tier
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Mfano mnunuaje atakavyoona:{" "}
          <span className="font-mono">1+ → 200tsh</span>,{" "}
          <span className="font-mono">5+ → 150tsh</span>,{" "}
          <span className="font-mono">10+ → 100tsh</span>.
        </p>
      </div>
    </div>
  );
}
