"use client";

import { useEffect, useState } from "react";
import { auth } from "../../../lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import DailyDips from "../../../components/DailyDips";
import PumpReadings from "../../../components/PumpReadings";
import FuelSales from "../../../components/FuelSales";
import LubricantSales from "../../../components/LubricantSales";
import FuelSalesHistory from "../../../components/FuelSalesHistory";
import FuelInventory from "../../../components/FuelInventory";

export default function OwnerDashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("Loading...");
  const [activeTab, setActiveTab] = useState("daily"); 
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);
  const [inventoryTab, setInventoryTab] = useState("fuel");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // List of all future modules
  const menuItems = [
    { id: "daily", label: "Daily Records" },
    { id: "sales", label: "Sales Management" },
    { id: "inventory", label: "Inventory" },
    { id: "salaries", label: "Salary Management" },
    { id: "debtors", label: "Debtor Management" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-black">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold tracking-wider">FUEL SYS</h2>
          <p className="text-xs text-gray-400 mt-1">Owner Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? "bg-blue-600 text-white font-medium" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-400 truncate mb-3">{userEmail}</p>
          <button 
            onClick={handleLogout}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {menuItems.find(m => m.id === activeTab)?.label}
          </h1>
        </header>
        
        <div className="max-w-5xl">
          {/* Conditional Rendering: Show components based on activeTab */}
          {activeTab === "daily" && (
            <div>
              <p className="text-gray-600 mb-6">Manage morning readings and historical daily data.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DailyDips userName={userEmail} />
                <PumpReadings userName={userEmail} />
              </div>
            </div>
          )}

          {activeTab === "sales" && (
             <div>
               <p className="text-gray-600 mb-6">Enter new sales records and view historical sales data.</p>
               
               {/* Top Section: Data Entry Forms */}
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Record New Sales</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <FuelSales 
                userName={userEmail} 
                onSuccess={() => setSalesRefreshKey(prev => prev + 1)} 
              />
              <LubricantSales userName={userEmail} />
            </div>

            {/* Bottom Section: History Tables */}
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Sales History</h3>
            <div className="grid grid-cols-1 gap-6">
              <FuelSalesHistory refreshTrigger={salesRefreshKey} 
              userRole="owner"
              />
            </div>
             </div>
          )}

          {activeTab === "inventory" && (
             <div>
               <p className="text-gray-600 mb-6">Manage stock levels and update pricing for all station products.</p>
               
               {/* Sub-Navigation Tabs */}
               <div className="flex space-x-1 border-b border-gray-200 mb-6">
                 <button
                   onClick={() => setInventoryTab("fuel")}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                     inventoryTab === "fuel"
                       ? "border-blue-600 text-blue-600"
                       : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                   }`}
                 >
                   Fuel Stock & Prices
                 </button>
                 <button
                   onClick={() => setInventoryTab("lubricants")}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                     inventoryTab === "lubricants"
                       ? "border-blue-600 text-blue-600"
                       : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                   }`}
                 >
                   Lubricants Catalog
                 </button>
                 <button
                   onClick={() => setInventoryTab("gas")}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                     inventoryTab === "gas"
                       ? "border-blue-600 text-blue-600"
                       : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                   }`}
                 >
                   Gas Cylinders
                 </button>
               </div>

               {/* Sub-Tab Content Areas */}
               <div className="bg-white p-6 rounded-lg shadow-sm border">
                 {inventoryTab === "fuel" && (
                   <FuelInventory />
                 )}
                 {inventoryTab === "lubricants" && (
                   <p className="text-gray-500 text-center py-8">Lubricants Inventory Component will go here.</p>
                 )}
                 {inventoryTab === "gas" && (
                   <p className="text-gray-500 text-center py-8">Gas Cylinders Inventory Component will go here.</p>
                 )}
               </div>
             </div>
          )}

          {activeTab === "salaries" && (
             <div className="bg-white p-6 rounded-lg shadow-sm border">
               <p className="text-gray-600">Salary Management Module (Under Construction)</p>
             </div>
          )}

          {activeTab === "debtors" && (
             <div className="bg-white p-6 rounded-lg shadow-sm border">
               <p className="text-gray-600">Debtor Management Module (Under Construction)</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}