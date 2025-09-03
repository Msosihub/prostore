"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = { id: string; name: string };

export default function CategorySelect({
  categories,
  onCategoryCreated,
}: {
  categories: Category[];
  onCategoryCreated: (cat: Category) => void;
}) {
  const { register } = useFormContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate() {
    // Call API to create category
    const res = await fetch("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const newCat = await res.json();
    onCategoryCreated(newCat);
    setName("");
    setOpen(false);
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Label htmlFor="categoryId">Category</Label>
        <select
          id="categoryId"
          {...register("categoryId")}
          className="w-full rounded-md border border-gray-300 p-2"
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        + Add
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleCreate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
