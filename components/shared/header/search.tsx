"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/types";
import { Loader, SearchIcon } from "lucide-react";
import useSWR from "swr";

const fetcher = async (url: string): Promise<Category[]> => {
  const res = await fetch(url);
  if (!res) throw new Error("Failed to fetch");
  return res.json();
};

const Search = () => {
  const {
    data: categories,
    error,
    isLoading,
  } = useSWR<Category[]>("/api/shared/categories", fetcher);

  if (!categories) return <Loader className="w-4 h-4 animate-spin" />;
  if (categories === null) return <Loader className="w-4 h-4 animate-spin" />;
  if (isLoading) return <Loader className="w-4 h-4 animate-spin" />;

  if (error || !categories) return <Loader className="w-4 h-4 animate-spin" />;

  return (
    <form action="/search" method="GET">
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Select name="category">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="All" value="all">
              Yote
            </SelectItem>
            {categories.map((x) => (
              <SelectItem key={x.id} value={x.name_en}>
                {x.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          name="q"
          type="text"
          placeholder="Tafuta..."
          className="md:w-[100px] lg:w-[300px]"
        />
        <Button>
          <SearchIcon />
        </Button>
      </div>
    </form>
  );
};

export default Search;
