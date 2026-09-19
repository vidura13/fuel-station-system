"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc } from "firebase/firestore";
import { FUEL_INVENTORY } from "../lib/constants";

interface FuelData {
  id: string;
  name: string;
  tankName: string;
  price: number;
  currentStock: number | "No Data";
}

export default function FuelInventory() {
  const [fuelData, setFuelData] = useState<FuelData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for inline price editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  // The 3 fuel types we track
  const fuelTypes = [
    { id: "92_petrol", name: "92 Petrol", tankName: "Tank 1 - 92 Petrol" },
    { id: "auto_diesel", name: "Auto Diesel", tankName: "Tank 2 - AUto Diesel" },
    { id: "kerosene", name: "Kerosene", tankName: "Tank 3 - Kerosene" }
  ];

  const fetchInventoryData = async () => {
    try {
      const combinedData: FuelData[] = [];

      // Loop through each fuel type to get its price and latest dip
      for (const fuel of FUEL_INVENTORY) {
        // 1. Get Price
        const priceDoc = await getDoc(doc(db, "fuel_prices", fuel.id));
        const price = priceDoc.exists() ? priceDoc.data().price : 0;

        // 2. Get Latest Dip (Stock)
        const dipQuery = query(
          collection(db, "daily_dips"),
          where("tankName", "==", fuel.tankName),
          orderBy("date", "desc"),
          limit(1)
        );
        const dipSnapshot = await getDocs(dipQuery);
        const currentStock = !dipSnapshot.empty ? dipSnapshot.docs[0].data().dipLevel : "No Data";

        combinedData.push({
          id: fuel.id,
          name: fuel.name,
          tankName: fuel.tankName,
          price,
          currentStock
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
  }, []);

  const handleUpdatePrice = async (id: string) => {
    if (!newPrice || isNaN(Number(newPrice))) return;
    setUpdating(true);
    
    try {
      await updateDoc(doc(db, "fuel_prices", id), {
        price: Number(newPrice)
      });
      
      // Refresh the data and close the edit mode
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
              <th className="px-6 py-3 font-medium text-gray-500 uppercase">Fuel Type</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase">Current Stock (Dip)</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase">Price per Liter (Rs.)</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fuelData.map((fuel) => (
              <tr key={fuel.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{fuel.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${fuel.currentStock === "No Data" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-800"}`}>
                    {fuel.currentStock} {fuel.currentStock !== "No Data" && "Liters"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
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
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingId === fuel.id ? (
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                      <button onClick={() => handleUpdatePrice(fuel.id)} disabled={updating} className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50">
                        {updating ? "..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(fuel.id); setNewPrice(fuel.price.toString()); }} className="text-blue-600 hover:text-blue-800 font-medium">
                      Update Price
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}