"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy, limit, startAfter, doc, deleteDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

interface FuelSale {
  id: string;
  salesDate: string;
  fuelType: string;
  quantity: number;
  enteredBy: string;
}

// Added userRole to the properties
export default function FuelSalesHistory({ refreshTrigger = 0, userRole }: { refreshTrigger?: number, userRole: string }) {
  const [sales, setSales] = useState<FuelSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const RECORDS_PER_PAGE = 20; 

  const [sortField, setSortField] = useState<keyof FuelSale>("salesDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchInitialSales = async () => {
      try {
        const q = query(
          collection(db, "fuel_sales"), 
          orderBy("salesDate", "desc"), 
          limit(RECORDS_PER_PAGE)
        );
        const querySnapshot = await getDocs(q);
        
        const salesData: FuelSale[] = [];
        querySnapshot.forEach((doc) => {
          salesData.push({ id: doc.id, ...doc.data() } as FuelSale);
        });
        
        setSales(salesData);
        
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastDoc(lastVisible);
        
        if (querySnapshot.docs.length < RECORDS_PER_PAGE) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching fuel sales:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialSales();
  }, [refreshTrigger]); 

  const loadMore = async () => {
    if (!lastDoc) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "fuel_sales"),
        orderBy("salesDate", "desc"),
        startAfter(lastDoc),
        limit(RECORDS_PER_PAGE)
      );
      const querySnapshot = await getDocs(q);

      const newSalesData: FuelSale[] = [];
      querySnapshot.forEach((doc) => {
        newSalesData.push({ id: doc.id, ...doc.data() } as FuelSale);
      });

      setSales((prevSales) => [...prevSales, ...newSalesData]);

      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastDoc(lastVisible);

      if (querySnapshot.docs.length < RECORDS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more sales:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // --- NEW DELETE FUNCTION ---
  const handleDelete = async (id: string) => {
    // Built-in browser confirmation box
    if (!window.confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, "fuel_sales", id));
      // Instantly remove it from the screen without needing to reload the whole table
      setSales((prevSales) => prevSales.filter((sale) => sale.id !== id));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete record. Please check your connection.");
    }
  };

  const handleSort = (field: keyof FuelSale) => {
    const isAsc = sortField === field && sortDirection === "asc";
    const newDirection = isAsc ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);

    const sortedData = [...sales].sort((a, b) => {
      if (a[field] < b[field]) return newDirection === "asc" ? -1 : 1;
      if (a[field] > b[field]) return newDirection === "asc" ? 1 : -1;
      return 0;
    });

    setSales(sortedData);
  };

  // Determine if the current user has permission to see the delete button
  const canDelete = userRole === "owner" || userRole === "manager";

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading sales history...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Fuel Sales History</h3>
        <span className="text-sm text-gray-500">Loaded Records: {sales.length}</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th onClick={() => handleSort("salesDate")} className="px-6 py-3 text-left font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                Date {sortField === "salesDate" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("fuelType")} className="px-6 py-3 text-left font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                Fuel Type {sortField === "fuelType" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("quantity")} className="px-6 py-3 text-left font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                Quantity (L) {sortField === "quantity" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">
                Entered By
              </th>
              {/* Conditionally render the Actions column header */}
              {canDelete && (
                <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-black">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={canDelete ? 5 : 4} className="px-6 py-4 text-center text-gray-500">No sales records found.</td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{sale.salesDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{sale.fuelType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{sale.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{sale.enteredBy}</td>
                  {/* Conditionally render the Delete button cell */}
                  {canDelete && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleDelete(sale.id)}
                        className="text-red-600 hover:text-red-900 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && sales.length > 0 && (
        <div className="p-4 border-t bg-gray-50 text-center">
          <button 
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? "Loading..." : "See More Records"}
          </button>
        </div>
      )}
    </div>
  );
}