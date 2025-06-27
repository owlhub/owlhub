"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name?: string;
  email: string;
}

interface Page {
  id: string;
  name: string;
  path: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  pages: Page[];
  users: User[];
  createdAt: string;
  updatedAt: string;
}

export default function RoleManagement() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch roles and users on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch roles
        const rolesResponse = await fetch("/api/roles");
        if (!rolesResponse.ok) {
          throw new Error("Failed to fetch roles");
        }
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.roles);

        // Fetch users
        const usersResponse = await fetch("/api/users");
        if (!usersResponse.ok) {
          throw new Error("Failed to fetch users");
        }
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create a new role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!newRoleName.trim()) {
      setError("Role name is required");
      return;
    }

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create role");
      }

      const data = await response.json();
      setRoles([...roles, { ...data.role, pages: [], users: [] }]);
      setNewRoleName("");
      setNewRoleDescription("");
      setSuccessMessage("Role created successfully");

      // Refresh the page to show the new role
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Attach a user to a role
  const handleAttachUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    if (!selectedUser) {
      setError("Please select a user");
      return;
    }

    try {
      const response = await fetch("/api/roles/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: selectedRole.id,
          userId: selectedUser,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to attach user to role");
      }

      await response.json();

      // Update the roles state to include the new user
      const updatedRoles = roles.map(role => {
        if (role.id === selectedRole.id) {
          const userToAdd = users.find(user => user.id === selectedUser);
          if (userToAdd && !role.users.some(user => user.id === selectedUser)) {
            return {
              ...role,
              users: [...role.users, userToAdd],
            };
          }
        }
        return role;
      });

      setRoles(updatedRoles);
      setSelectedUser("");
      setSuccessMessage("User attached to role successfully");

      // Refresh the page to show the updated role
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Detach a user from a role
  const handleDetachUser = async (roleId: string, userId: string) => {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/roles/users?roleId=${roleId}&userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to detach user from role");
      }

      // Update the roles state to remove the user
      const updatedRoles = roles.map(role => {
        if (role.id === roleId) {
          return {
            ...role,
            users: role.users.filter(user => user.id !== userId),
          };
        }
        return role;
      });

      setRoles(updatedRoles);
      setSuccessMessage("User detached from role successfully");

      // Refresh the page to show the updated role
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Filter out users that are already assigned to the selected role
  const availableUsers = selectedRole
    ? users.filter(user => !selectedRole.users.some(roleUser => roleUser.id === user.id))
    : users;

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Error and success messages */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
          <p>{successMessage}</p>
        </div>
      )}

      {/* Create new role form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-4">Create New Role</h3>
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label htmlFor="roleName" className="block text-sm font-medium mb-1">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="roleName"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="roleDescription" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="roleDescription"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Role
          </button>
        </form>
      </div>

      {/* Attach user to role form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-4">Attach User to Role</h3>
        <form onSubmit={handleAttachUser} className="space-y-4">
          <div>
            <label htmlFor="roleSelect" className="block text-sm font-medium mb-1">
              Select Role <span className="text-red-500">*</span>
            </label>
            <select
              id="roleSelect"
              value={selectedRole?.id || ""}
              onChange={(e) => {
                const role = roles.find(r => r.id === e.target.value);
                setSelectedRole(role || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="userSelect" className="block text-sm font-medium mb-1">
              Select User <span className="text-red-500">*</span>
            </label>
            <select
              id="userSelect"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={!selectedRole}
            >
              <option value="">Select a user</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
            {selectedRole && availableUsers.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">All users are already assigned to this role.</p>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={!selectedRole || !selectedUser}
          >
            Attach User
          </button>
        </form>
      </div>

      {/* Role details with user management */}
      {roles.length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold mb-4">Role Details</h3>
          <div className="space-y-6">
            {roles.map((role) => (
              <div key={role.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold">{role.name}</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{role.description || "No description"}</p>
                <div className="mt-4">
                  <h5 className="font-medium mb-2">Assigned Users:</h5>
                  {role.users.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {role.users.map((user) => (
                        <li key={user.id} className="flex items-center justify-between">
                          <span>{user.name || user.email}</span>
                          <button
                            onClick={() => handleDetachUser(role.id, user.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="Remove user from role"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No users assigned</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
