"use client";

import DashboardShell from "../../../components/DashboardShell";

// Restricted-entry panel: morning dips & meter readings only.
// Financial and inventory modules are neither shown here nor readable
// from this account (enforced by firestore.rules).
export default function WorkerDashboard() {
  return <DashboardShell requiredRole="worker" />;
}
