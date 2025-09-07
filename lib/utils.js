import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Lightweight client-side activity logger used across Admin/Inventory/POS
export async function logActivity({ activityType, description, tableName = null, recordId = null, userId = null, username = null, role = null }) {
  try {
    const payload = {
      action: 'log_activity',
      user_id: userId,
      username,
      role,
      activity_type: activityType,
      description,
      table_name: tableName,
      record_id: recordId,
    };
    await fetch('http://localhost/Enguio_Project/Api/backend.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    // no-op
  }
}