"use client";

import { NextUIProvider } from "@nextui-org/react";
import { SettingsProvider } from "./Inventory_Con/SettingsContext";

export function Providers({ children }) {
  return (
    <NextUIProvider>
      <SettingsProvider>
        {children}
      </SettingsProvider>
    </NextUIProvider>
  );
} 