"use client";

// Lubricant sales history — mirrors FuelSalesHistory:
// cursor pagination (20/page), client-side sorting, owner-exclusive delete.
// Old records created before price snapshots may have no totalAmount — shown as "—".

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  doc,
  deleteDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

interface LubricantSale {
  id: string;
  salesDate: string;
  productName: string;
  quantity: number;
  totalAmount?: number;
  enteredBy: string;
}

export default function LubricantSalesHistory({
  refreshTrigger = 0,
  userRole,
}: {
  refreshTrigger?: number;
  userRole: string;
}) {
  const [sales, setSales] = useState<LubricantSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const RECORDS_PER_PAGE = 20;

  const [sortField, setSortField] = useState<keyof LubricantSale>("salesDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const q = query(
          collection(db, "lubricant_sales"),
          orderBy("salesDate", "desc"),
          limit(RECORDS_PER_PAGE)
        );
        const snap = await getDocs(q);

        const data: LubricantSale[] = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() } as LubricantSale));

        setSales(data);
        setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
        if (snap.docs.length < RECORDS_PER_PAGE) setHasMore(false);
      } catch (error) {
        console.error("Error fetching lubricant sales:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [refreshTrigger]);

  const loadMore = async () => {
    if (!lastDoc) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "lubricant_sales"),
        orderBy("salesDate", "desc"),
        startAfter(lastDoc),
        limit(RECORDS_PER_PAGE)
      );
      const snap = await getDocs(q);

      const data: LubricantSale[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as LubricantSale));

      setSales((prev) => [...prev, ...data]);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      if (snap.docs.length < RECORDS_PER_PAGE) setHasMore(false);
    } catch (error) {
      console.error("Error loading more sales:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record? This cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, "lubricant_sales", id));
      setSales((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete record. Please check your connection.");
    }
  };

  const handleSort = (field: keyof LubricantSale) => {
    const isAsc = sortField === field && sortDirection === "asc";
    const newDirection = isAsc ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);

    setSales((prev) =>
      [...prev].sort((a, b) => {
        if (a[field]! < b[field]!) return newDirection === "asc" ? -1 : 1;
        if (a[field]! > b[field]!) return newDirection === "asc" ? 1 : -1;
        return 0;
      })
    );
  };

  // Spec: deleting historical records is OWNER-EXCLUSIVE (rules enforce too)
  const canDelete = userRole === "owner";

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading lubricant sales history...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Lubricant Sales History</h3>
        <span className="text-sm text-gray-500">Loaded Records: {sales.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort("salesDate")}
                className="px-6 py-3 text-left font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Date {sortField === "salesDate" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("productName")}
                className="px-6 py-3 text-left font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Product {sortField === "productName" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("quantity")}
                className="px-6 py-3 text-left font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Qty {sortField === "quantity" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("totalAmount")}
                className="px-6 py-3 text-left font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              >
                Amount (Rs.) {sortField === "totalAmount" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Entered By</th>
              {canDelete && (
                <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-black">
            {sales.length === 0 ? (
              <tr>
                <td
                  colSpan={canDelete ? 6 : 5}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No lubricant sales records found.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{sale.salesDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {sale.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{sale.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {typeof sale.totalAmount === "number"
                      ? `Rs. ${sale.totalAmount.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{sale.enteredBy}</td>
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
