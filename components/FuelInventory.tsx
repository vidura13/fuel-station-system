"use client";

// ============================================================================
// FUEL STOCK & PRICES
// For each fuel type shows:
//   • Dip Stock          — the latest morning dip reading (physical measure)
//   • Sold Since Dip     — sum of fuel_sales dated AFTER the dip's calendar day
//   • Estimated Remaining— dip − sold since dip
// plus inline price editing (owner/manager — enforced by firestore.rules).
//
// Reads are kept cheap: exactly 1 price doc + 1 dip doc + 1 aggregation per
// fuel type (the sum is computed server-side by Firestore, not by reading
// every sale document).
// ============================================================================

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  getAggregateFromServer,
  sum,
} from "firebase/firestore";
import { FUEL_INVENTORY } from "../lib/constants";

interface FuelData {
  id: string;
  name: string;
  price: number;
  dipStock: number | null;
  soldSinceDip: number | null;
  remaining: number | null;
  dipDate: string | null;
}

export default function FuelInventory() {
  const [fuelData, setFuelData] = useState<FuelData[]>([]);
  const [loading, setLoading] = useState(true);

  // State for inline price editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchInventoryData = async () => {
    try {
      const combinedData: FuelData[] = [];

      for (const fuel of FUEL_INVENTORY) {
        // 1. Get Price
        const priceDoc = await getDoc(doc(db, "fuel_prices", fuel.id));
        const price = priceDoc.exists() ? Number(priceDoc.data().price ?? 0) : 0;

        // 2. Get Latest Dip (physical stock measure)
        const dipQuery = query(
          collection(db, "daily_dips"),
          where("tankName", "==", fuel.tankName),
          orderBy("date", "desc"),
          limit(1)
        );
        const dipSnapshot = await getDocs(dipQuery);

        let dipStock: number | null = null;
        let dipDate: string | null = null;
        let soldSinceDip: number | null = null;

        if (!dipSnapshot.empty) {
          const dipData = dipSnapshot.docs[0].data();
          dipStock = Number(dipData.dipLevel);

          // Calendar date of the dip in Sri Lanka (UTC+5:30), e.g. "2026-09-19".
          // Fuel sales dated AFTER this day happened after the dip was taken.
          const ts = dipData.date;
          if (ts && typeof ts.toMillis === "function") {
            dipDate = new Date(ts.toMillis() + 5.5 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10);

            // 3. Sum sales dated after the dip (server-side aggregation)
            const soldQuery = query(
              collection(db, "fuel_sales"),
              where("fuelType", "==", fuel.salesType),
              where("salesDate", ">", dipDate)
            );
            const agg = await getAggregateFromServer(soldQuery, {
              total: sum("quantity"),
            });
            soldSinceDip = Number(agg.data().total ?? 0);
          }
        }

        const remaining =
          dipStock !== null && soldSinceDip !== null
            ? Math.max(0, dipStock - soldSinceDip)
            : null;

        combinedData.push({
          id: fuel.id,
          name: fuel.name,
          price,
          dipStock,
          soldSinceDip,
          remaining,
          dipDate,
        });
      }

      setFuelData(combinedData);
    } catch (error) {
      console.error("Error fetching fuel inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdatePrice = async (id: string) => {
    if (!newPrice || isNaN(Number(newPrice))) return;
    setUpdating(true);

    try {
      await updateDoc(doc(db, "fuel_prices", id), {
        price: Number(newPrice),
      });

      await fetchInventoryData();
      setEditingId(null);
      setNewPrice("");
    } catch (error) {
      console.error("Error updating price:", error);
      alert("Failed to update price.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading fuel inventory...</div>;

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-4">Live Fuel Inventory & Pricing</h3>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase">Fuel Type</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase">Dip Stock (L)</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase">Sold Since Dip</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase">Est. Remaining (L)</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase">Price / Liter (Rs.)</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fuelData.map((fuel) => (
              <tr key={fuel.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{fuel.name}</span>
                  {fuel.dipDate && (
                    <span className="block text-xs text-gray-400">dip: {fuel.dipDate}</span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {fuel.dipStock === null ? (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600">
                      No Data
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                      {fuel.dipStock.toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                  {fuel.soldSinceDip === null ? "—" : fuel.soldSinceDip.toLocaleString()}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {fuel.remaining === null ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        fuel.remaining <= 1000
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {fuel.remaining.toLocaleString()} L
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                  {editingId === fuel.id ? (
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder={fuel.price.toString()}
                      className="border rounded px-2 py-1 w-24 text-black focus:outline-blue-500"
                      autoFocus
                    />
                  ) : (
                    `Rs. ${fuel.price.toFixed(2)}`
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right">
                  {editingId === fuel.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdatePrice(fuel.id)}
                        disabled={updating}
                        className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                      >
                        {updating ? "..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(fuel.id);
                        setNewPrice(fuel.price.toString());
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Update Price
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Remaining = latest morning dip − sales dated after that dip. Low-stock highlight: 1,000 L or
        less.
      </p>
    </div>
  );
}
