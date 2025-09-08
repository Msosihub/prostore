"use client";

import * as React from "react";
import { ControllerRenderProps, FieldPath, FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

// type Props = {
//   label: string;
//   placeholder?: string;
//   field: ControllerRenderProps<any, any>;
//   options: Option[];
//   setOptions: React.Dispatch<React.SetStateAction<Option[]>>;
//   onCreate: (name: string) => Promise<{ id: string; label: string } | null>;
// };

type Props<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  label: string;
  placeholder?: string;
  field: ControllerRenderProps<TFieldValues, TName>;
  options: Option[];
  setOptions: React.Dispatch<React.SetStateAction<Option[]>>;
  onCreate: (name: string) => Promise<{ id: string; label: string } | null>;
};

export default function CreatableSelect({
  label,
  placeholder,
  field,
  options,
  setOptions,
  onCreate,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createValue, setCreateValue] = React.useState("");
  const selected = options.find((o) => o.id === field.value);

  async function handleCreate() {
    if (!createValue.trim()) return;
    const res = await onCreate(createValue.trim());
    if (res) {
      setOptions((prev) => [{ id: res.id, label: res.label }, ...prev]);
      field.onChange(res.id);
      setCreateValue("");
      setCreateOpen(false);
      setOpen(false);
    }
  }

  return (
    <div className="w-full">
      <Label className="mb-1 block">{label}</Label>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn("w-full justify-between")}
            >
              {selected ? selected.label : (placeholder ?? "Select")}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.label}
                    onSelect={() => {
                      field.onChange(opt.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        opt.id === field.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              autoFocus
              placeholder={`Enter ${label.toLowerCase()} name`}
              value={createValue}
              onChange={(e) => setCreateValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
