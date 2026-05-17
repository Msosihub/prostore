"use client";

import { motion } from "framer-motion";
import { Loader2, Smartphone, CheckCircle2 } from "lucide-react";

interface PaymentLoadingScreenProps {
  stage: "creating" | "push_sent" | "completed";
}

export default function PaymentLoadingScreen({
  stage,
}: PaymentLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600 to-green-700 text-white px-6 text-center">
      <div className="relative flex items-center justify-center w-24 h-24 mb-6">
        {stage === "creating" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Loader2 className="w-16 h-16 opacity-90" />
          </motion.div>
        )}

        {stage === "push_sent" && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Smartphone className="w-14 h-14 relative z-10 animate-bounce" />
            </motion.div>
          </>
        )}

        {stage === "completed" && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <CheckCircle2 className="w-20 h-20 text-white drop-shadow-lg" />
          </motion.div>
        )}
      </div>

      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="space-y-2 max-w-md"
      >
        {stage === "creating" && (
          <>
            <h2 className="text-xl md:text-2xl font-bold tracking-wide">
              Tunaandaa Agizo Lako...
            </h2>
            <p className="text-emerald-100 text-sm md:text-base font-light">
              Tafadhali usifunge ukurasa huu wakati tunatengeneza risiti yako ya
              malipo.
            </p>
          </>
        )}

        {stage === "push_sent" && (
          <>
            <h2 className="text-xl md:text-2xl font-bold tracking-wide">
              Angalia Simu Yako Sasa!
            </h2>
            <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
              Ombi la malipo limeshatumwa. <br />
              Weka{" "}
              <span className="font-semibold underline underline-offset-4">
                Namba yako ya Siri (PIN)
              </span>{" "}
              kukamilisha malipo.
            </p>
          </>
        )}

        {stage === "completed" && (
          <>
            <h2 className="text-2xl md:text-3xl font-bold tracking-wide">
              Agizo Limekamilika!
            </h2>
            <p className="text-emerald-100 text-sm md:text-base font-light">
              Asante! Tunakupeleka kwenye ukurasa wa historia ya maagizo yako...
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
