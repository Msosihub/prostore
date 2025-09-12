import { DollarSign, Headset, ShoppingBag, WalletCards } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const IconBoxes = () => {
  return (
    <div>
      <Card>
        <CardContent className="grid md:grid-cols-4 gap-4 p-4">
          <div className="space-y-2">
            <ShoppingBag />
            <div className="text-sm font-bold">Usafiri Bure</div>
            <div className="text-sm text-muted-foreground">
              Usafirishaji bure kwa order juu ya 250,000/=
            </div>
          </div>
          <div className="space-y-2">
            <DollarSign />
            <div className="text-sm font-bold">Dhamana ya Kurudishiwa Pesa</div>
            <div className="text-sm text-muted-foreground">
              Kati ya siku 30 za ununuzi
            </div>
          </div>
          <div className="space-y-2">
            <WalletCards />
            <div className="text-sm font-bold">Lipa vyovyote</div>
            <div className="text-sm text-muted-foreground">
              Lipa kwa MPesa, TigoPesa, Bank n.k
            </div>
          </div>
          <div className="space-y-2">
            <Headset />
            <div className="text-sm font-bold">Msaada 24/7</div>
            <div className="text-sm text-muted-foreground">
              Pata msaada wakati wowote
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IconBoxes;
