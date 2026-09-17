"use client";

import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function FuelSales({ userName, onSuccess }: { userName: string; onSuccess?: () => void }) {
  // Automatically calculate yesterday's date for the default input
  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [fuelType, setFuelType] = useState("92 Petrol");
  const [quantity, setQuantity] = useState("");
  const [salesDate, setSalesDate] = useState(getYesterday());
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      await addDoc(collection(db, "fuel_sales"), {
        fuelType: fuelType,
        quantity: Number(quantity),
        salesDate: salesDate, // The day the sales actually happened
        enteredBy: userName,
        systemEntryDate: serverTimestamp(), // The exact moment they pressed submit
      });
      
      setMessage("Success: Fuel sales recorded!");
      setQuantity(""); 
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Detailed Error:", error);
      setIsError(true);
      setMessage("Error saving data. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Previous Day Fuel Sales</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sales Date</label>
            <input 
              type="date" 
              required
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
            <select 
              value={fuelType} 
              onChange={(e) => setFuelType(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            >
              <option>92 Petrol</option>
              <option>Diesel</option>
              <option>Kerosene</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity Sold (Liters)</label>
            <input 
              type="number" 
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 1500"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md text-sm ${isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Submit Sales Record"}
        </button>
      </form>
    </div>
  );
}