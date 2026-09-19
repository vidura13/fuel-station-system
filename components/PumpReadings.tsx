"use client";

import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { PUMPS } from "../lib/constants";

export default function PumpReadings({ userName }: { userName: string }) {
  const [pump, setPump] = useState<string>(PUMPS[0]);
  const [reading, setReading] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      // 1. Fetch secure Sri Lanka time
      const timeResponse = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Colombo");
      if (!timeResponse.ok) throw new Error("Failed to fetch from Time API");
      const timeData = await timeResponse.json();
      
      const trueHour = timeData.hour;

      // 2. Enforce the 12 PM rule
      if (trueHour >= 12) {
        setIsError(true);
        setMessage("Error: Meter readings must be entered before 12 PM (Sri Lanka Time).");
        setLoading(false);
        return; 
      }

      // 3. Save to the correct database collection
      await addDoc(collection(db, "meter_readings"), {
        pumpName: pump,
        reading: Number(reading),
        enteredBy: userName,
        date: serverTimestamp(),
      });
      
      setMessage("Success: Meter reading recorded!");
      setReading(""); 
    } catch (error) {
      console.error("Detailed Error:", error);
      setIsError(true);
      setMessage("Error verifying network time or saving data. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Morning Pump Meter Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Pump</label>
            <select 
              value={pump} 
              onChange={(e) => setPump(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
            >
              {PUMPS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Meter Reading</label>
            <input 
              type="number" 
              required
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="Enter exact reading"
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
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Submit Meter Reading"}
        </button>
      </form>
    </div>
  );
}