"use client";

// ============================================================================
// DASHBOARD SHELL — shared, role-guarded layout for all three dashboards.
//
// SECURITY MODEL: this component verifies the signed-in user's role (from
// users/{uid} in Firestore) matches the page's required role, and redirects
// elsewhere if not. This is the UX layer — the real enforcement lives in
// firestore.rules (workers cannot read sales/financial data even if they
// reach a page that would render it).
// ============================================================================

import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import DailyDips from "./DailyDips";
import PumpReadings from "./PumpReadings";
import FuelSales from "./FuelSales";
import LubricantSales from "./LubricantSales";
import FuelSalesHistory from "./FuelSalesHistory";
import LubricantSalesHistory from "./LubricantSalesHistory";
import FuelInventory from "./FuelInventory";
import InventoryManager from "./InventoryManager";

export type Role = "owner" | "manager" | "worker";

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner Panel",
  manager: "Manager Panel",
  worker: "Station Staff",
};

// Which modules each role can see (mirrors firestore.rules — UI layer only)
const MENU: { id: string; label: string; roles: Role[] }[] = [
  { id: "daily", label: "Daily Records", roles: ["owner", "manager", "worker"] },
  { id: "sales", label: "Sales Management", roles: ["owner", "manager"] },
  { id: "inventory", label: "Inventory", roles: ["owner", "manager"] },
  { id: "salaries", label: "Salary Management", roles: ["owner"] },
  { id: "debtors", label: "Debtor Management", roles: ["owner"] },
];

export default function DashboardShell({ requiredRole }: { requiredRole: Role }) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [activeTab, setActiveTab] = useState("daily");
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);
  const [inventoryTab, setInventoryTab] = useState("fuel");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email ?? "");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const actualRole = snap.exists() ? (snap.data().role as string) : null;

        if (actualRole === "owner" || actualRole === "manager" || actualRole === "worker") {
          setRole(actualRole);
          if (actualRole !== requiredRole) {
            // Right person, wrong door — send them to their own panel
            router.replace(`/dashboard/${actualRole}`);
          } else {
            setAuthorized(true);
          }
        } else {
          // No profile / unassigned role — boot to login
          await signOut(auth);
          router.replace("/login");
        }
      } catch (err) {
        console.error("Role verification failed:", err);
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [router, requiredRole]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // --------------------------------------------------------------------
  // Guard states — don't render ANY module content until verified
  // --------------------------------------------------------------------
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse text-gray-500 font-medium">Verifying access…</div>
          <p className="text-xs text-gray-400 mt-2">
            If you are not redirected shortly,{" "}
            <button onClick={() => router.push("/login")} className="underline">
              return to login
            </button>
          </p>
        </div>
      </div>
    );
  }

  const menuItems = MENU.filter((item) => item.roles.includes(requiredRole));

  return (
    <div className="flex min-h-screen bg-gray-50 text-black">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold tracking-wider">FUEL SYS</h2>
          <p className="text-xs text-gray-400 mt-1">{ROLE_LABELS[requiredRole]}</p>
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
            {menuItems.find((m) => m.id === activeTab)?.label ?? "Dashboard"}
          </h1>
        </header>

        <div className="max-w-5xl">
          {/* ---------------- DAILY RECORDS ---------------- */}
          {activeTab === "daily" && (
            <div>
              <p className="text-gray-600 mb-6">
                {requiredRole === "worker"
                  ? "Submit the morning tank dips and pump meter readings. Entries are accepted only before 12:00 PM Sri Lanka time."
                  : "Manage morning readings and historical daily data."}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DailyDips userName={userEmail} />
                <PumpReadings userName={userEmail} />
              </div>
            </div>
          )}

          {/* ---------------- SALES MANAGEMENT ---------------- */}
          {activeTab === "sales" && (
            <div>
              <p className="text-gray-600 mb-6">Enter new sales records and view historical sales data.</p>

              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Record New Sales</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <FuelSales userName={userEmail} onSuccess={() => setSalesRefreshKey((prev) => prev + 1)} />
                <LubricantSales userName={userEmail} />
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Sales History</h3>
              <div className="grid grid-cols-1 gap-6">
                {/* Delete button is owner-exclusive (matches firestore.rules) */}
                <FuelSalesHistory refreshTrigger={salesRefreshKey} userRole={role ?? requiredRole} />
              </div>
            </div>
          )}

          {/* ---------------- INVENTORY ---------------- */}
          {activeTab === "inventory" && (
            <div>
              <p className="text-gray-600 mb-6">Manage stock levels and update pricing for all station products.</p>

              <div className="flex space-x-1 border-b border-gray-200 mb-6">
                {[
                  { id: "fuel", label: "Fuel Stock & Prices" },
                  { id: "lubricants", label: "Lubricants Catalog" },
                  { id: "gas", label: "Gas Cylinders" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setInventoryTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      inventoryTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                {inventoryTab === "fuel" && <FuelInventory />}
                {inventoryTab === "lubricants" && (
                  <p className="text-gray-500 text-center py-8">Lubricants Inventory Component will go here.</p>
                )}
                {inventoryTab === "gas" && (
                  <p className="text-gray-500 text-center py-8">Gas Cylinders Inventory Component will go here.</p>
                )}
              </div>
            </div>
          )}

          {/* ---------------- OWNER-ONLY PLACEHOLDERS ---------------- */}
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
