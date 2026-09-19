// ============================================================================
// SINGLE SOURCE OF TRUTH for tank / pump / fuel identifiers.
//
// WHY THIS FILE EXISTS: these exact strings are stored verbatim in Firestore
// documents AND whitelisted in firestore.rules. Before this file, the same
// labels were hardcoded in 3 components and had already drifted ("Tank 2 -
// AUto Diesel" vs "Tank 2 - Diesel"), which silently broke the Auto Diesel
// stock lookup.
//
// WARNING: renaming a label here changes what NEW documents look like but
// does NOT rewrite history, and the rules whitelist must match. Coordinate
// all three when changing any string.
// ============================================================================

export const TANKS = [
  "Tank 1 - 92 Petrol",
  "Tank 2 - Diesel",
  "Tank 3 - Kerosene",
] as const;

export const PUMPS = [
  "Pump 1 - 92 Petrol",
  "Pump 2 - Diesel",
  "Pump 3 - Kerosene",
] as const;

export const FUEL_TYPES = ["92 Petrol", "Diesel", "Kerosene"] as const;

// Maps a fuel_sales "fuelType" value to its fuel_prices document id
export const FUEL_PRICE_IDS: Record<string, string> = {
  "92 Petrol": "92_petrol",
  "Diesel": "auto_diesel",
  "Kerosene": "kerosene",
};

// Maps each fuel_prices doc id to:
//   tankName  — the tank whose latest dip reflects its physical stock
//   salesType — the fuelType value used in fuel_sales documents
// (Display name and sales name intentionally differ for diesel.)
export const FUEL_INVENTORY: {
  id: string;
  name: string;
  tankName: string;
  salesType: string;
}[] = [
  { id: "92_petrol", name: "92 Petrol", tankName: "Tank 1 - 92 Petrol", salesType: "92 Petrol" },
  // FIX: was "Tank 2 - AUto Diesel" (typo) — never matched dip records
  { id: "auto_diesel", name: "Auto Diesel", tankName: "Tank 2 - Diesel", salesType: "Diesel" },
  { id: "kerosene", name: "Kerosene", tankName: "Tank 3 - Kerosene", salesType: "Kerosene" },
];
