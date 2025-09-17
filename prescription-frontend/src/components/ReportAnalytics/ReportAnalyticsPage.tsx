"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./ReportAnalyticsPage.css"; // External CSS
import { useNavigate } from "react-router-dom";

export default function AnalyticsPage() {
  const [filters, setFilters] = useState({
    doctor: "",
    month: "",
    medicine: "",
    patient: "",
  });

  // Dummy Data
  const prescriptionTrends = [
    { month: "Jan", total: 30 },
    { month: "Feb", total: 42 },
    { month: "Mar", total: 51 },
    { month: "Apr", total: 64 },
    { month: "May", total: 75 },
    { month: "Jun", total: 90 },
  ];

  const topMedicines = [
    { name: "Paracetamol", prescriptions: 120 },
    { name: "Amoxicillin", prescriptions: 95 },
    { name: "Ibuprofen", prescriptions: 85 },
    { name: "Cough Syrup", prescriptions: 65 },
    { name: "Vitamin D", prescriptions: 55 },
  ];

  const doctorStats = [
    { name: "Dr. John", value: 40 },
    { name: "Dr. Smith", value: 30 },
    { name: "Dr. Mary", value: 20 },
    { name: "Dr. Ali", value: 10 },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  const navigate = useNavigate();

  return (
    <div className="analytics-container">
      {/* 🔹 Page Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div className="title-wrapper">
            <span className="header-icon">📊</span>
            <div>
              <h1 className="header-title">Reports & Analytics</h1>
              <p className="header-subtitle">
                Generate detailed medical reports and insights
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="back-btn"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* 🔹 White Content Wrapper */}
      <div className="analytics-content">
        {/* Filters */}
        <h2 className="section-title">Filters</h2>
        <div className="filter-section">
          <div className="filter-item">
            <label>Doctor:</label>
            <select
              value={filters.doctor}
              onChange={(e) => setFilters({ ...filters, doctor: e.target.value })}
            >
              <option value="">All</option>
              <option value="Dr. John">Dr. John</option>
              <option value="Dr. Smith">Dr. Smith</option>
              <option value="Dr. Mary">Dr. Mary</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Month:</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            >
              <option value="">All</option>
              <option value="Jan">Jan</option>
              <option value="Feb">Feb</option>
              <option value="Mar">Mar</option>
              <option value="Apr">Apr</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Medicine:</label>
            <select
              value={filters.medicine}
              onChange={(e) =>
                setFilters({ ...filters, medicine: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="Paracetamol">Paracetamol</option>
              <option value="Amoxicillin">Amoxicillin</option>
              <option value="Ibuprofen">Ibuprofen</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Patient:</label>
            <input
              type="text"
              placeholder="Enter patient name"
              value={filters.patient}
              onChange={(e) =>
                setFilters({ ...filters, patient: e.target.value })
              }
            />
          </div>
        </div>

        {/* Summary Cards */}
        <h2 className="section-title">Summary</h2>
        <div className="card-grid">
          <div className="card">
            <h3>Total Prescriptions</h3>
            <p>485</p>
          </div>
          <div className="card">
            <h3>Active Patients</h3>
            <p>134</p>
          </div>
          <div className="card">
            <h3>Top Medicine</h3>
            <p>Paracetamol</p>
          </div>
          <div className="card">
            <h3>Expiring Soon</h3>
            <p>8</p>
          </div>
        </div>

        {/* Charts */}
        <h2 className="section-title">Charts</h2>
        <div className="chart-grid">
          <div className="chart-card">
            <h2>Prescriptions Over Time</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={prescriptionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h2>Prescriptions by Doctor</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={doctorStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {doctorStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card chart-wide">
            <h2>Top Medicines</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMedicines}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="prescriptions" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
