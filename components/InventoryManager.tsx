"use client";

// ============================================================================
// INVENTORY MANAGER — generic CRUD component for the Phase 4 inventory tabs.
// Used for BOTH:
//   • lubricants_catalog  (engine oils & fluids)
//   • gas_cylinders       (Litro 12.5KG / 5KG / 2.3KG)
//
// Access model (UI layer — firestore.rules enforces the same):
//   owner + manager: create & edit products
//   owner only:      delete products
// ============================================================================

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface Item {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export default function InventoryManager({
  collectionName,
  singularLabel,
  userRole,
  suggestions = [],
}: {
  collectionName: string;
  singularLabel: string;
  userRole: string;
  suggestions?: string[];
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // New-item form state
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [saving, setSaving] = useState(false);

  const canDelete = userRole === "owner";

  const flash = (msg: string, err = false) => {
    setMessage(msg);
    setIsError(err);
    setTimeout(() => setMessage(""), 4000);
  };

  const fetchItems = async () => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const data: Item[] = [];
      snap.forEach((d) =>
        data.push({
          id: d.id,
          name: String(d.data().name ?? ""),
          price: Number(d.data().price ?? 0),
          stock: Number(d.data().stock ?? d.data().quantity ?? 0),
        })
      );
      // Keep the list stable and alphabetical
      data.sort((a, b) => a.name.localeCompare(b.name));
      setItems(data);
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      flash(`Error loading ${collectionName}.`, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isNaN(Number(newPrice)) || isNaN(Number(newStock))) return;

    setAdding(true);
    try {
      await addDoc(collection(db, collectionName), {
        name: newName.trim(),
        price: Number(newPrice),
        stock: Number(newStock),
      });
      flash(`${singularLabel} added successfully.`);
      setNewName("");
      setNewPrice("");
      setNewStock("");
      await fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
      flash(`Failed to add ${singularLabel.toLowerCase()}.`, true);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditStock(String(item.stock));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || isNaN(Number(editPrice)) || isNaN(Number(editStock))) {
      flash("Invalid values — check name, price and stock.", true);
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, collectionName, id), {
        name: editName.trim(),
        price: Number(editPrice),
        stock: Number(editStock),
      });
      setEditingId(null);
      flash(`${singularLabel} updated.`);
      await fetchItems();
    } catch (error) {
      console.error("Error updating item:", error);
      flash("Failed to update. Check your connection.", true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Delete this ${singularLabel.toLowerCase()} permanently? This cannot be undone.`))
      return;

    try {
      await deleteDoc(doc(db, collectionName, id));
      flash(`${singularLabel} deleted.`);
      await fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      flash("Failed to delete. Owners only.", true);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading inventory...</div>;
  }

  return (
    <div>
      {/* ---- Add new item ---- */}
      <h3 className="text-lg font-bold text-gray-800 mb-4">Add New {singularLabel}</h3>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            required
            list={`${collectionName}-suggestions`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`e.g. ${suggestions[0] ?? `${singularLabel} name`}`}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          />
          <datalist id={`${collectionName}-suggestions`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Price (Rs.)</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="e.g. 5250"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stock (Units)</label>
          <input
            type="number"
            required
            min="0"
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            placeholder="e.g. 24"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={adding}
            className="w-full px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {adding ? "Adding..." : `Add ${singularLabel}`}
          </button>
        </div>
      </form>

      {message && (
        <div
          className={`p-3 rounded-md text-sm mb-6 ${
            isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* ---- Inventory table ---- */}
      <h3 className="text-lg font-bold text-gray-800 mb-4">Current {singularLabel} Inventory</h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase">Price (Rs.)</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 font-medium text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                  No {singularLabel.toLowerCase()}s yet — add the first one above.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border rounded px-2 py-1 w-full text-black focus:outline-blue-500"
                        autoFocus
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="border rounded px-2 py-1 w-28 text-black focus:outline-blue-500"
                      />
                    ) : (
                      `Rs. ${item.price.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        min="0"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        className="border rounded px-2 py-1 w-20 text-black focus:outline-blue-500"
                      />
                    ) : (
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.stock <= 5
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {item.stock} units
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {editingId === item.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={saving}
                          className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                        >
                          {saving ? "..." : "Save"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Low-stock highlight: 5 units or fewer. Deleting is owner-only.
      </p>
    </div>
  );
}
