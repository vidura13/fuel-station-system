"use client";

import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function DailyDips({ userName }: { userName: string }) {
  const [tank, setTank] = useState("Tank 1 - 92 Petrol");
  const [dipLevel, setDipLevel] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      // 1. Fetch time using a more reliable API
      const timeResponse = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Colombo");
      if (!timeResponse.ok) throw new Error("Failed to fetch from Time API");
      const timeData = await timeResponse.json();

      // 2. timeapi.io provides the exact hour directly as a number! Much cleaner.
      const trueHour = timeData.hour;

      // 3. Enforce the 12 PM rule
      if (trueHour >= 12) {
        setIsError(true);
        setMessage("Error: Daily dips must be entered before 12 PM (Sri Lanka Time).");
        setLoading(false);
        return; 
      }

      // 4. Save to the database
      await addDoc(collection(db, "daily_dips"), {
        tankName: tank,
        dipLevel: Number(dipLevel),
        enteredBy: userName,
        date: serverTimestamp(),
      });
      
      setMessage("Success: Dip level recorded!");
      setDipLevel(""); 
    } catch (error) {
      // THIS is the crucial addition. It prints the actual technical error to your browser console.
      console.error("Detailed Error:", error); 
      setIsError(true);
      setMessage("Error verifying network time or saving data. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Morning Fuel Dip Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Tank</label>
            <select 
              value={tank} 
              onChange={(e) => setTank(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            >
              <option>Tank 1 - 92 Petrol</option>
              <option>Tank 2 - Diesel</option>
              <option>Tank 3 - Kerosene</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Dip Level (Liters/mm)</label>
            <input 
              type="number" 
              required
              value={dipLevel}
              onChange={(e) => setDipLevel(e.target.value)}
              placeholder="Enter amount"
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Submit Dip Level"}
        </button>
      </form>
    </div>
  );
}