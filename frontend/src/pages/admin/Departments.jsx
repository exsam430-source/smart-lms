// src/pages/admin/Departments.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiRefresh,
  HiAcademicCap,
  HiBriefcase,
  HiPlusCircle,
  HiMinusCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Loader from "../../components/common/Loader";

import { adminApi } from "../../api/adminApi";
import { useApi } from "../../hooks/useApi";
import { staggerContainer, slideUp } from "../../utils/constants";
import { cn } from "../../utils/helpers";

const Departments = () => {
  const { loading, execute } = useApi();

  const [departments, setDepartments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [programs, setPrograms] = useState([]); // Array of { name: string, batches: string[] }

  // Temporarily holding a new program input in the modal
  const [newProgName, setNewProgName] = useState("");
  const [newProgBatches, setNewProgBatches] = useState("");

  const fetchDepartments = async () => {
    await execute(() => adminApi.getDepartments(), {
      showSuccessToast: false,
      onSuccess: (data) => {
        setDepartments(Array.isArray(data) ? data : []);
      },
    });
  };

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setName("");
    setPrograms([]);
    setNewProgName("");
    setNewProgBatches("");
    setSelectedDept(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (dept) => {
    setSelectedDept(dept);
    setName(dept.name || "");
    setPrograms(Array.isArray(dept.programs) ? dept.programs : []);
    setNewProgName("");
    setNewProgBatches("");
    setIsModalOpen(true);
  };

  const handleAddProgram = (e) => {
    e.preventDefault();
    if (!newProgName.trim()) {
      toast.error("Program name is required");
      return;
    }

    const parsedBatches = newProgBatches
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    setPrograms((prev) => [
      ...prev,
      {
        name: newProgName.trim(),
        batches: parsedBatches,
      },
    ]);

    setNewProgName("");
    setNewProgBatches("");
    toast.success("Program added locally. Remember to save changes!");
  };

  const handleRemoveProgram = (index) => {
    setPrograms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      programs: programs,
    };

    if (selectedDept?._id) {
      await execute(() => adminApi.updateDepartment(selectedDept._id, payload), {
        showSuccessToast: true,
        successMessage: "Department updated successfully!",
        onSuccess: () => {
          setIsModalOpen(false);
          resetForm();
          fetchDepartments();
        },
      });
    } else {
      await execute(() => adminApi.createDepartment(payload), {
        showSuccessToast: true,
        successMessage: "Department created successfully!",
        onSuccess: () => {
          setIsModalOpen(false);
          resetForm();
          fetchDepartments();
        },
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedDept?._id) return;

    await execute(() => adminApi.deleteDepartment(selectedDept._id), {
      showSuccessToast: true,
      successMessage: "Department deleted successfully!",
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedDept(null);
        fetchDepartments();
      },
    });
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={slideUp}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-dark-900">Departments & Programs</h1>
          <p className="text-dark-500">Manage academic departments, degree programs, and active batches</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={HiRefresh} onClick={fetchDepartments} loading={loading}>
            Refresh
          </Button>
          <Button icon={HiPlus} onClick={openCreate}>
            Add Department
          </Button>
        </div>
      </motion.div>

      {/* ── Content Grid ── */}
      {loading && departments.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Loader size="lg" />
        </div>
      ) : departments.length === 0 ? (
        <motion.div variants={slideUp}>
          <Card className="text-center py-12">
            <HiAcademicCap className="w-12 h-12 text-dark-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-dark-700">No Departments Found</p>
            <p className="text-sm text-dark-500 mt-1">Create your first department to configure programs and batches.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              Create Department
            </Button>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={slideUp}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {departments.map((dept) => (
            <Card
              key={dept._id}
              className="shadow-sm hover:shadow-md transition-all border border-dark-100 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
                      <HiAcademicCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-dark-900 leading-tight">{dept.name}</h3>
                      <p className="text-xs text-dark-500 mt-0.5">{dept.programs?.length || 0} degree program(s)</p>
                    </div>
                  </div>
                </div>

                {/* Programs and Batches display */}
                <div className="mt-5 space-y-4">
                  {dept.programs && dept.programs.length > 0 ? (
                    dept.programs.map((prog, pIdx) => (
                      <div key={pIdx} className="bg-dark-50/50 p-3 rounded-xl border border-dark-100/50 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary-700">
                          <HiBriefcase className="w-3.5 h-3.5" />
                          <span>{prog.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prog.batches && prog.batches.length > 0 ? (
                            prog.batches.map((batch) => (
                              <span
                                key={batch}
                                className="px-2 py-0.5 bg-white text-dark-600 rounded text-[10px] font-semibold border border-dark-200"
                              >
                                {batch}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-dark-400 italic">No active batches</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-dark-400 italic">No programs registered</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-6 border-t border-dark-50">
                <Button
                  size="xs"
                  variant="outline"
                  icon={HiPencil}
                  onClick={() => openEdit(dept)}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  icon={HiTrash}
                  className="text-red-500 hover:text-red-700"
                  onClick={() => {
                    setSelectedDept(dept);
                    setIsDeleteOpen(true);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={selectedDept ? "Edit Department" : "Add Department"}
        description="Configure dynamic degree programs and session batches under this department."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Department of Computer Sciences"
            required
          />

          {/* Program list header */}
          <div className="border-t border-dark-100 pt-4">
            <h3 className="text-sm font-bold text-dark-800 mb-2">Degree Programs ({programs.length})</h3>

            {/* List of current programs */}
            {programs.length === 0 ? (
              <p className="text-xs text-dark-500 italic mb-4">No programs added yet. Use the tool below to add programs.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                {programs.map((prog, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-dark-50 p-2.5 rounded-xl border border-dark-100"
                  >
                    <div>
                      <p className="text-xs font-bold text-dark-800">{prog.name}</p>
                      <p className="text-[10px] text-dark-500 mt-0.5">
                        Batches: {prog.batches?.join(", ") || "None"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProgram(index)}
                      className="text-red-500 hover:text-red-700 p-1 transition-colors"
                    >
                      <HiMinusCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inner Form to Add a Program */}
            <div className="bg-primary-50/30 p-4 rounded-2xl border border-primary-100 space-y-3">
              <p className="text-xs font-bold text-primary-800">Add Degree Program</p>
              <div className="grid grid-cols-1 gap-3">
                <Input
                  label="Program Name"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  placeholder="e.g., BS Computer Science (BSCS)"
                />
                <div>
                  <label className="block text-xs font-semibold text-dark-700 mb-1">
                    Batches (comma-separated)
                  </label>
                  <input
                    type="text"
                    className="input text-xs"
                    value={newProgBatches}
                    onChange={(e) => setNewProgBatches(e.target.value)}
                    placeholder="e.g., 2021-2025, 2022-2026, 2023-2027"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={HiPlusCircle}
                className="mt-1"
                onClick={handleAddProgram}
              >
                Add Program Option
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {selectedDept ? "Save Department" : "Create Department"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedDept(null);
        }}
        onConfirm={handleDelete}
        title="Delete Department"
        description={`Are you sure you want to delete the department "${selectedDept?.name}"? All associated program and batch selectors will be disconnected.`}
        loading={loading}
      />
    </motion.div>
  );
};

export default Departments;
