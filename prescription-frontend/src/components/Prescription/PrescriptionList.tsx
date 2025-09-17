import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { dynamoDBService } from '../../services/dynamoDBService';
import "./EnhancedPrescriptionList.css";
import {
  Prescription,
  formatBloodPressure,
  formatTemperature,
  formatSugarLevel,
  getBloodPressureCategory,
  getTemperatureCategory
} from '../../types/index';
import EnhancedPrescriptionForm from './PrescriptionForm';

const EnhancedPrescriptionList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'normal' | 'urgent' | 'emergency'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'patient'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openPrescriptions, setOpenPrescriptions] = useState<{ [key: string]: boolean }>({});
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (prescription: any) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPrescription(null);
    setIsModalOpen(false);
  };

  const toggleCard = (id: string) => {
    setOpenPrescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await dynamoDBService.getAllPrescriptions();
      setPrescriptions(data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Error loading prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prescriptionId: string) => {
    if (!hasPermission('canEditPrescriptions')) {
      toast.error('You do not have permission to edit prescriptions');
      return;
    }
    navigate(`/prescriptions/edit/${prescriptionId}`);
  };

  const handleDelete = async (prescriptionId: string) => {
    if (!hasPermission('canDeletePrescriptions')) {
      toast.error('You do not have permission to delete prescriptions');
      return;
    }

    const prescription = prescriptions.find(p => p.prescriptionId === prescriptionId);
    if (!prescription) return;

    const confirmMessage = `Are you sure you want to delete the prescription for ${prescription.patientDetails.name}?\n\nThis action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setDeletingId(prescriptionId);

      // Update status to cancelled instead of deleting
      await dynamoDBService.updatePrescription(prescriptionId, {
        status: 'cancelled',
        modificationReason: 'Cancelled by doctor',
      });

      setPrescriptions(prev => prev.filter(p => p.prescriptionId !== prescriptionId));
      toast.success('Prescription cancelled successfully');
    } catch (error: any) {
      console.error('Error deleting prescription:', error);
      toast.error(error.message || 'Error deleting prescription');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (prescriptionId: string, newStatus: 'active' | 'completed' | 'cancelled') => {
    try {
      await dynamoDBService.updatePrescription(prescriptionId, {
        status: newStatus,
        modificationReason: `Status changed to ${newStatus}`,
      });

      setPrescriptions(prev =>
        prev.map(p =>
          p.prescriptionId === prescriptionId
            ? { ...p, status: newStatus, updatedAt: new Date().toISOString() }
            : p
        )
      );

      toast.success(`Prescription status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Error updating prescription status');
    }
  };

  // Filter, search, and sort prescriptions
  const filteredPrescriptions = prescriptions
    .filter(prescription => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        prescription.patientDetails.name?.toLowerCase().includes(lowerSearch) ||
        prescription.symptoms.toLowerCase().includes(lowerSearch) ||
        (prescription.diagnosis?.toLowerCase().includes(lowerSearch) ?? false) ||
        prescription.prescriptionId.toLowerCase().includes(lowerSearch);

      const matchesStatus = filterStatus === 'all' || prescription.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || prescription.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.prescriptionDate).getTime() - new Date(b.prescriptionDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { emergency: 3, urgent: 2, normal: 1 };
          comparison =
            (priorityOrder[a.priority ?? 'normal'] ?? 1) - (priorityOrder[b.priority ?? 'normal'] ?? 1);
          break;
        case 'patient':
          comparison = (a.patientDetails.name || '').localeCompare(b.patientDetails.name || '');
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency":
        return {
          backgroundColor: "#FEE2E2", // red-100
          color: "#991B1B",           // red-800
          borderColor: "#FECACA",     // red-200
        };
      case "urgent":
        return {
          backgroundColor: "#FFEDD5", // orange-100
          color: "#9A3412",           // orange-800
          borderColor: "#FED7AA",     // orange-200
        };
      case "normal":
        return {
          backgroundColor: "#DCFCE7", // green-100
          color: "#166534",           // green-800
          borderColor: "#BBF7D0",     // green-200
        };
      default:
        return {
          backgroundColor: "#F3F4F6", // gray-100
          color: "#1F2937",           // gray-800
          borderColor: "#E5E7EB",     // gray-200
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return {
          backgroundColor: "#DBEAFE", // blue-100
          color: "#1E40AF",           // blue-800
          borderColor: "#BFDBFE",     // blue-200
        };
      case "completed":
        return {
          backgroundColor: "#DCFCE7", // green-100
          color: "#166534",           // green-800
          borderColor: "#BBF7D0",     // green-200
        };
      case "cancelled":
        return {
          backgroundColor: "#FEE2E2", // red-100
          color: "#991B1B",           // red-800
          borderColor: "#FECACA",     // red-200
        };
      default:
        return {
          backgroundColor: "#F3F4F6", // gray-100
          color: "#1F2937",           // gray-800
          borderColor: "#E5E7EB",     // gray-200
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto p-6">
      {/* Title & New Prescription Button */}
      {/* <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600 mt-1">Manage patient prescriptions and medical records</p>
        </div>
        {hasPermission('canCreatePrescriptions') && (
          <Link
            to="/prescriptions/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <span>➕</span>
            New Prescription
          </Link>
        )}
      </div> */}

      <div style={{
        background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '16px',
        marginBottom: '20px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Prescription Icon */}
            <span style={{ fontSize: '2.5em', marginRight: '12px' }}>📝</span>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5em', fontWeight: '400' }}>
                Prescriptions
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1.2em' }}>
                Manage patient prescriptions and medical records
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.25)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Tabs Header */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "list", label: "📋 Prescription List" },
            { id: "new", label: "➕ New Prescription" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "list" | "new")}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: "8px",
                background:
                  activeTab === tab.id
                    ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                    : "#f8f9fa",
                color: activeTab === tab.id ? "white" : "#666",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontSize: "14px",
                boxShadow:
                  activeTab === tab.id
                    ? "0 4px 8px rgba(0,0,0,0.15)"
                    : "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === "list" && (
            <div className="bg-white p-6 m-6 rounded-lg shadow-md" style={{
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 48px)", // full height container (minus margins/header)
            }}>
              {/* Replace with your actual prescription list */}
              {/* Filters and Search */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 mb-6" style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                background: "#f9fafb", // ensure background so it doesn't overlap
              }}>
                <div className="bg-gray-100 p-6 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4">
                  {/* Search - takes 2x space on large screens */}
                  <div className="flex-1 min-w-[250px] md:flex-[2]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                      type="text"
                      placeholder="Search by patient, symptoms, diagnosis, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Priorities</option>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="date">Date</option>
                      <option value="priority">Priority</option>
                      <option value="patient">Patient Name</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>


                {/* Results Summary */}
                <div className="mt-4 text-sm text-gray-600">
                  Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
                </div>
              </div>

              {/* Prescriptions Grid */}
              <div style={{
                flex: 1,

                // backgroundColor: 'aliceblue',
                maxHeight: "900px", // fixed height
                height: "900px",    // optional: enforce exact height
                overflowY: "auto",
                padding: "20px",    // uniform padding
                boxSizing: "border-box", // ensures padding doesn't increase overall height

              }}>
                {/* --- Prescriptions Grid --- */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: "20px",
                   padding: "20px",    // uniform padding
                   
                    backgroundColor: 'whitesmoke',
                  }}
                >
                  {filteredPrescriptions.map((prescription: any) => (
                    <div
                      key={prescription.prescriptionId}
                      style={{
                        background: "#fff",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {/* Header */}
                      <div
                        onClick={() => setSelectedPrescription(prescription)} // 🔹 open modal
                        style={{
                          padding: "16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          background: "#f9fafb",
                          borderTopLeftRadius: "12px",
                          borderTopRightRadius: "12px",
                        }}
                      >
                        {/* Avatar + Name + Priority + Status + ID */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {/* Avatar */}
                          <div
                            style={{
                              width: "50px",
                              height: "50px",
                              borderRadius: "50%",
                              background: "#dbeafe",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 600,
                              color: "#1d4ed8",
                              fontSize: "18px",
                            }}
                          >
                            {prescription.patientDetails.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Patient Info */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {/* Name + Badges */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "18px",
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              >
                                {prescription.patientDetails.name}
                              </h3>

                              {/* Priority + Status */}
                              <div style={{ display: "flex", gap: "6px" }}>
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    borderRadius: "9999px",
                                    border: "1px solid",
                                    ...getPriorityColor(prescription.priority ?? "normal"),
                                  }}
                                >
                                  {(prescription.priority ?? "normal").toUpperCase()}
                                </span>
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    borderRadius: "9999px",
                                    border: "1px solid",
                                    ...getStatusColor(prescription.status),
                                  }}
                                >
                                  {prescription.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Patient ID */}
                            <p style={{ margin: 0, fontSize: "16px", color: "#6b7280" }}>
                              ID: {prescription.prescriptionId.split("-").pop()}
                            </p>
                          </div>
                        </div>

                        {/* Expand Button */}
                        <button
                          style={{
                            background: "transparent",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#2563eb",
                            cursor: "pointer",
                          }}
                        >
                          Expand
                        </button>
                      </div>
                    </div>
                  ))}
                </div>


                {/* --- Fullscreen Modal --- */}
                {selectedPrescription && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: "12px",
                        width: "80%",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        padding: "20px",
                        position: "relative",
                      }}
                    >
                      {/* Close Button */}
                      <button
                        onClick={() => setSelectedPrescription(null)}
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          background: "transparent",
                          border: "none",
                          fontSize: "16px",
                          cursor: "pointer",
                          color: "#2563eb",
                        }}
                      >
                        ✖
                      </button>

                      {/* Modal Title */}
                      <h2 style={{ marginBottom: "16px" }}>
                        Prescription for {selectedPrescription.patientDetails.name}
                      </h2>

                      {/* Patient Info */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                          fontSize: "14px",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
                          <strong>Age:</strong> {selectedPrescription.patientDetails.age}
                        </div>
                        {selectedPrescription.patientDetails.bloodGroup && (
                          <div>
                            <strong>Blood:</strong> {selectedPrescription.patientDetails.bloodGroup}
                          </div>
                        )}
                      </div>

                      {/* Vitals */}
                      {/* Vitals Summary */}
                      {selectedPrescription.vitals && (
                        <div
                          style={{
                            backgroundColor: "#F5F3FF",
                            padding: "12px",
                            borderRadius: "6px",
                            border: "1px solid #E9D8FD",
                            // marginTop: "12px",
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#6B21A8",
                              marginBottom: "8px",
                            }}
                          >
                            Vitals Recorded
                          </h4>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px",
                              fontSize: "12px",
                            }}
                          >
                            {/* Blood Pressure */}
                            {selectedPrescription.vitals.bloodPressureSystolic &&
                              selectedPrescription.vitals.bloodPressureDiastolic && (
                                <div>
                                  <span style={{ color: "#4B5563" }}>BP:</span>
                                  <span style={{ marginLeft: "4px", color: "#7E22CE" }}>
                                    {formatBloodPressure(
                                      selectedPrescription.vitals.bloodPressureSystolic,
                                      selectedPrescription.vitals.bloodPressureDiastolic
                                    )}{" "}
                                    (
                                    {getBloodPressureCategory(
                                      selectedPrescription.vitals.bloodPressureSystolic,
                                      selectedPrescription.vitals.bloodPressureDiastolic
                                    )}
                                    )
                                  </span>
                                </div>
                              )}

                            {/* Pulse */}
                            {selectedPrescription.vitals.pulseRate && (
                              <div>
                                <span style={{ color: "#4B5563" }}>Pulse:</span>
                                <span style={{ marginLeft: "4px", color: "#7E22CE" }}>
                                  {selectedPrescription.vitals.pulseRate} bpm
                                </span>
                              </div>
                            )}

                            {/* Temperature */}
                            {selectedPrescription.vitals.temperature && (
                              <div>
                                <span style={{ color: "#4B5563" }}>Temp:</span>
                                <span style={{ marginLeft: "4px", color: "#7E22CE" }}>
                                  {formatTemperature(selectedPrescription.vitals.temperature)} (
                                  {getTemperatureCategory(selectedPrescription.vitals.temperature)})
                                </span>
                              </div>
                            )}

                            {/* Sugar */}
                            {selectedPrescription.vitals.sugarLevel && (
                              <div>
                                <span style={{ color: "#4B5563" }}>Sugar:</span>
                                <span style={{ marginLeft: "4px", color: "#7E22CE" }}>
                                  {Object.entries(selectedPrescription.vitals.sugarLevel)
                                    .filter(([_, value]) => value)
                                    .map(([key, value]) => {
                                      const labels: Record<string, string> = {
                                        preMeal: "Pre",
                                        postMeal: "Post",
                                        fastingGlucose: "Fasting",
                                        randomGlucose: "Random",
                                      };
                                      return `${labels[key] || key}: ${value}`;
                                    })
                                    .join(", ") + " mg/dL"}
                                </span>
                              </div>
                            )}

                            {/* Height */}
                            {selectedPrescription.vitals.height && (
                              <div>
                                <span style={{ color: "#4B5563" }}>Height:</span>
                                <span style={{ marginLeft: "4px", color: "#7E22CE" }}>
                                  {selectedPrescription.vitals.height} cm
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}


                      {/* Symptoms */}
                      <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                        <strong>Symptoms:</strong>
                        <p style={{ margin: "4px 0 0 0", color: "#4b5563" }}>
                          {selectedPrescription.symptoms}
                        </p>
                      </div>

                      {/* Diagnosis */}
                      {selectedPrescription.diagnosis && (
                        <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                          <strong>Diagnosis:</strong>
                          <p style={{ margin: "4px 0 0 0", color: "#4b5563" }}>
                            {selectedPrescription.diagnosis}
                          </p>
                        </div>
                      )}

                      {/* Medicines */}
                      <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                        <strong>Medicines:</strong>
                        <div
                          style={{
                            marginTop: "6px",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
                          {selectedPrescription.medicines.map((med: any, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: "12px",
                                color: "#374151",
                                background: "#f3f4f6",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <strong>{med.medicineName}</strong> - {med.dosage}, {med.frequency}
                            </span>
                          ))}
                        </div>
                      </div>


                      {/* Doctor & Date */}
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                        <div>Dr. {selectedPrescription.doctorName || "Unknown"}</div>
                        <div>
                          {selectedPrescription.prescriptionDate
                            ? formatDate(selectedPrescription.prescriptionDate)
                            : "Unknown Date"}
                        </div>
                      </div>


                      {/* ✅ Actions Section */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTop: "1px solid #f3f4f6",
                          paddingTop: "10px",
                        }}
                      >
                        {/* Left: View + Edit */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          <a
                            href={`/prescriptions/${selectedPrescription.prescriptionId}`}
                            style={{
                              color: "#2563eb",
                              fontSize: "13px",
                              fontWeight: 500,
                              textDecoration: "none",
                            }}
                          >
                            View
                          </a>
                          {hasPermission("canEditPrescriptions") &&
                            selectedPrescription.status === "active" && (
                              <button
                                onClick={() => handleEdit(selectedPrescription.prescriptionId)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#16a34a",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>
                            )}
                        </div>

                        {/* Right: Status + Delete */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {hasPermission("canEditPrescriptions") && (
                            <select
                              value={selectedPrescription.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  selectedPrescription.prescriptionId,
                                  e.target.value as any
                                )
                              }
                              style={{
                                fontSize: "12px",
                                padding: "4px 6px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                outline: "none",
                              }}
                            >
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                          {hasPermission("canDeletePrescriptions") && (
                            <button
                              onClick={() => handleDelete(selectedPrescription.prescriptionId)}
                              disabled={deletingId === selectedPrescription.prescriptionId}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#dc2626",
                                fontSize: "13px",
                                fontWeight: 500,
                                cursor: "pointer",
                                opacity:
                                  deletingId === selectedPrescription.prescriptionId ? 0.5 : 1,
                              }}
                            >
                              {deletingId === selectedPrescription.prescriptionId
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>



              {/* Empty State */}
              {filteredPrescriptions.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">
                    {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                      ? 'No prescriptions found matching your filters.'
                      : 'No prescriptions found.'}
                  </div>
                  {hasPermission('canCreatePrescriptions') && (
                    <button
                      onClick={() => navigate("/prescription/create")}
                      style={{
                        background: '#00b894',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 8px 20px rgba(0, 184, 148, 0.3)'
                      }}
                    >
                      Create Prescription
                    </button>
                  )}
                </div>
              )}

              {/* Stats Summary */}
              {prescriptions.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Summary</h3>

                  <div
                    style={{
                      backgroundColor: "#f9fafb", // bg-gray-50
                      borderRadius: "16px",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                      padding: "16px", // reduced outer padding
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      flexWrap: "wrap", // responsive layout
                    }}
                  >
                    {/* Active */}
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#eff6ff", // blue-50
                        borderRadius: "12px",
                        padding: "12px", // reduced padding
                        display: "flex",
                        flexDirection: "row", // row layout for compactness
                        alignItems: "center",
                        justifyContent: "space-evenly",
                        minHeight: "70px", // slimmer card
                      }}
                    >
                      <div style={{ color: "#2563eb", fontSize: "22px", fontWeight: "bold" }}>
                        {prescriptions.filter((p) => p.status === "active").length}
                      </div>
                      <div style={{ color: "#1e40af", fontSize: "16px", fontWeight: 500 }}>
                        Active
                      </div>
                      <svg
                        style={{ color: "#60a5fa" }}
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    {/* Completed */}
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#ecfdf5", // green-50
                        borderRadius: "12px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-evenly",
                        minHeight: "70px",
                      }}
                    >
                      <div style={{ color: "#16a34a", fontSize: "22px", fontWeight: "bold" }}>
                        {prescriptions.filter((p) => p.status === "completed").length}
                      </div>
                      <div style={{ color: "#166534", fontSize: "16px", fontWeight: 500 }}>
                        Completed
                      </div>
                      <svg
                        style={{ color: "#4ade80" }}
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    {/* Urgent */}
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#fff7ed", // orange-50
                        borderRadius: "12px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-evenly",
                        minHeight: "70px",
                      }}
                    >
                      <div style={{ color: "#ea580c", fontSize: "22px", fontWeight: "bold" }}>
                        {prescriptions.filter((p) => p.priority === "urgent").length}
                      </div>
                      <div style={{ color: "#9a3412", fontSize: "16px", fontWeight: 500 }}>
                        Urgent
                      </div>
                      <svg
                        style={{ color: "#f97316" }}
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    {/* Emergency */}
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#fef2f2", // red-50
                        borderRadius: "12px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-evenly",
                        minHeight: "70px",
                      }}
                    >
                      <div style={{ color: "#dc2626", fontSize: "22px", fontWeight: "bold" }}>
                        {prescriptions.filter((p) => p.priority === "emergency").length}
                      </div>
                      <div style={{ color: "#991b1b", fontSize: "16px", fontWeight: 500 }}>
                        Emergency
                      </div>
                      <svg
                        style={{ color: "#ef4444" }}
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                      </svg>
                    </div>
                  </div>


                </div>
              )}

            </div>
          )}

          {activeTab === "new" && hasPermission('canCreatePrescriptions') && (
            <EnhancedPrescriptionForm
              onCancel={() => setActiveTab("list")}
              onSuccess={() => {
                setActiveTab("list");
                fetchPrescriptions();
              }}
            />
          )}
        </div>
      </div>


    </div>
  );
};

export default EnhancedPrescriptionList;
