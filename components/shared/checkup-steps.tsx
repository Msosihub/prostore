import React from "react";
import { cn } from "@/lib/utils";

const steps = ["1 Usajili", "2 Usafirishaji", "3 Njia ya malipo", "4 Agiza"];

const CheckoutSteps = ({ current = 0 }: { current?: number }) => {
  return (
    <div className="flex-between flex-col md:flex-row space-x-2 space-y-2 mb-10">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={cn(
              "relative p-2 w-56 rounded-full text-center text-sm",
              index === current ? "bg-secondary" : ""
            )}
          >
            {step}
            {index < current && (
              <span className="absolute top-2 right-3 h-2 w-2 rounded-full bg-green-500" />
            )}
          </div>
          {index < steps.length - 1 && (
            <hr className="w-16 border-t border-gray-300 mx-2" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default CheckoutSteps;
