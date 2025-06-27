"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
}

export default function UserStatusToggle({ userId, isActive: initialIsActive }: UserStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggleStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user status");
      }

      const data = await response.json();
      setIsActive(data.user.isActive);

      // Refresh the page to show the updated status
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error updating user status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={toggleStatus}
        disabled={isLoading}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
          isActive
            ? "bg-[var(--error)] hover:opacity-90 focus:ring-[var(--error)] text-white"
            : "bg-[var(--success)] hover:opacity-90 focus:ring-[var(--success)] text-white"
        } focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
        ) : null}
        {isActive ? "Deactivate User" : "Activate User"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}
