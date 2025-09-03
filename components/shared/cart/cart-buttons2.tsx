import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addItemToCart, removeItemFromCart } from "@/lib/actions/cart.actions";
import { CartItem } from "@/types";
import { Loader, ChevronDownCircle, ChevronUpCircle } from "lucide-react";
import { useTransition } from "react";

const IncrementButton = ({ item }: { item: CartItem }) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      variant="ghost"
      size="icon"
      className="text-green-600 hover:text-green-800"
      onClick={() =>
        startTransition(async () => {
          const res = await addItemToCart(item);
          if (!res.success) {
            toast({
              variant: "destructive",
              description: res.message,
            });
          }
        })
      }
    >
      {isPending ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <ChevronUpCircle className="w-4 h-4" />
      )}
    </Button>
  );
};

const DecrementButton = ({ item }: { item: CartItem }) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      variant="ghost"
      size="icon"
      className="text-red-600 hover:text-red-800"
      onClick={() =>
        startTransition(async () => {
          const res = await removeItemFromCart(item.productId);
          if (!res.success) {
            toast({
              variant: "destructive",
              description: res.message,
            });
          }
        })
      }
    >
      {isPending ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <ChevronDownCircle className="w-4 h-4" />
      )}
    </Button>
  );
};

export { IncrementButton, DecrementButton };
