"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SkeletonTable } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { User, CreateUserPayload } from "@/lib/types";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["admin", "user"]),
});

export function SettingsUsers() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await api.get<User[]>("/admin/users");
      setUsers(data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("user");
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormRole(user.role);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormErrors({});

    if (!editUser) {
      const result = userSchema.safeParse({
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
      });
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          errors[issue.path[0] as string] = issue.message;
        });
        setFormErrors(errors);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editUser) {
        const body: Record<string, string> = {
          name: formName,
          email: formEmail,
          role: formRole,
        };
        if (formPassword) body.password = formPassword;
        await api.put(`/admin/users/${editUser.id}`, body);
        addToast({ type: "success", message: "User updated" });
      } else {
        const body: CreateUserPayload = {
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        };
        await api.post("/admin/users", body);
        addToast({ type: "success", message: "User created" });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      addToast({
        type: "error",
        message: error instanceof Error ? error.message : "Operation failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      addToast({ type: "success", message: "User deleted" });
      setDeleteUser(null);
      fetchUsers();
    } catch (error) {
      addToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete",
      });
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription className="mt-1">
              Manage user accounts and roles
            </CardDescription>
          </div>
          <Button
            onClick={openCreateModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add User
          </Button>
        </div>

        {loading ? (
          <SkeletonTable rows={5} />
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">No users found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <span className="font-medium">{user.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-text-secondary">{user.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "primary" : "default"}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={user.is_active ? "success" : "danger"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-text-secondary">
                      {formatDate(user.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                        aria-label="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteUser(user)}
                        className="p-2 rounded-button text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? "Edit User" : "Create User"}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            error={formErrors.name}
          />
          <Input
            label="Email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            type="email"
            error={formErrors.email}
          />
          <Input
            label={editUser ? "Password (leave blank to keep)" : "Password"}
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            type="password"
            error={formErrors.password}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Role
            </label>
            <div className="flex items-center gap-4">
              {(["user", "admin"] as const).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formRole === role}
                    onChange={() => setFormRole(role)}
                    className="text-primary focus:ring-primary bg-surface-1 border-border-subtle"
                  />
                  <span className="text-sm text-text-primary capitalize">
                    {role}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              isLoading={submitting}
            >
              {editUser ? "Update User" : "Create User"}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteUser?.name}? This action cannot be undone.`}
        size="sm"
      >
        <div className="flex items-center gap-3 pt-4">
          <Button variant="danger" onClick={handleDelete}>
            Delete User
          </Button>
          <Button variant="ghost" onClick={() => setDeleteUser(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
