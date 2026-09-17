"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

// Define what a product looks like so TypeScript is happy
interface Product {
  id: string;
  name: string;
  stock: number;
}

export default function LubricantSales({ userName }: { userName: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split('T')[0]); // Defaults to today
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch the catalog from Firestore when this component first loads
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "lubricants_catalog"));
        const catalogData: Product[] = [];
        querySnapshot.forEach((doc) => {
          catalogData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(catalogData);
        // Automatically select the first item in the list if it exists
        if (catalogData.length > 0) {
          setSelectedProductId(catalogData[0].id);
        }
      } catch (error) {
        console.error("Error fetching catalog:", error);
      }
    };

    fetchCatalog();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      // Find the name of the product we are selling to save it in the record
      const product = products.find(p => p.id === selectedProductId);
      
      await addDoc(collection(db, "lubricant_sales"), {
        productId: selectedProductId,
        productName: product?.name || "Unknown Product",
        quantity: Number(quantity),
        salesDate: salesDate,
        enteredBy: userName,
        systemEntryDate: serverTimestamp(),
      });
      
      setMessage("Success: Lubricant sale recorded!");
      setQuantity(""); 
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
      <h2 className="text-xl font-bold text-gray-800 mb-4">Daily Lubricant Sales</h2>
      
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
            <label className="block text-sm font-medium text-gray-700">Select Product</label>
            <select 
              value={selectedProductId} 
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              required
            >
              {products.length === 0 ? (
                <option value="">Loading products...</option>
              ) : (
                products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Stock: {product.stock})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity Sold</label>
            <input 
              type="number" 
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2"
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
          disabled={loading || products.length === 0}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Submit Lubricant Sale"}
        </button>
      </form>
    </div>
  );
}