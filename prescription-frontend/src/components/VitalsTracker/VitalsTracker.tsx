"use client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
export default function VitalsTracker() {
  const [vitals, setVitals] = useState<any[]>([
    {
      date: "2025-09-10",
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      temperature: 36.8,
      spo2: 98,
      weight: 70,
    },
    {
      date: "2025-09-12",
      systolic: 135,
      diastolic: 85,
      heartRate: 76,
      temperature: 37.1,
      spo2: 96,
      weight: 71,
    },
  ]);

   const navigate = useNavigate();
  const [form, setForm] = useState<any>({
    systolic: "",
    diastolic: "",
    heartRate: "",
    temperature: "",
    spo2: "",
    weight: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const newVital = {
      ...form,
      date: new Date().toISOString().split("T")[0],
    };
    setVitals([...vitals, newVital]);
    setForm({
      systolic: "",
      diastolic: "",
      heartRate: "",
      temperature: "",
      spo2: "",
      weight: "",
    });
  };

  const inputStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "8px 12px",
    width: "100%",
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    padding: "20px",
    marginBottom: "20px",
  };

  const buttonStyle: React.CSSProperties = {
    gridColumn: "span 2 / span 2",
    background: "#2563eb",
    color: "#fff",
    borderRadius: "8px",
    padding: "10px",
    border: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* Page Header */}
    <div style={{
       background: 'linear-gradient(135deg, rgb(255 0 191) 0%, rgb(0, 114, 255)',
        color: 'white',
        padding: '30px',
        borderRadius: '16px',
        marginBottom: '20px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Prescription Icon */}
          <span style={{ fontSize: "2.5em", marginRight: "12px" }}>🩺</span>

            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5em', fontWeight: '400' }}>
                Vitals Tracker
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1.2em' }}>
              Track and monitor key patient vitals in real time
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

      {/* Add Vitals Form */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Record New Vitals</h3>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "16px",
          }}
        >
          <input
            type="number"
            name="systolic"
            placeholder="Systolic (mmHg)"
            value={form.systolic}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            type="number"
            name="diastolic"
            placeholder="Diastolic (mmHg)"
            value={form.diastolic}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            type="number"
            name="heartRate"
            placeholder="Heart Rate (bpm)"
            value={form.heartRate}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            type="number"
            name="temperature"
            placeholder="Temperature (°C)"
            value={form.temperature}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            type="number"
            name="spo2"
            placeholder="SpO₂ (%)"
            value={form.spo2}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            type="number"
            name="weight"
            placeholder="Weight (kg)"
            value={form.weight}
            onChange={handleChange}
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>
            Save Vitals
          </button>
        </form>
      </div>

      {/* Vitals History */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
          Vitals History
        </h3>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th style={{ padding: "8px" }}>Date</th>
              <th style={{ padding: "8px" }}>BP</th>
              <th style={{ padding: "8px" }}>HR</th>
              <th style={{ padding: "8px" }}>Temp</th>
              <th style={{ padding: "8px" }}>SpO₂</th>
              <th style={{ padding: "8px" }}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {vitals.map((v, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px" }}>{v.date}</td>
                <td style={{ padding: "8px" }}>
                  {v.systolic}/{v.diastolic}
                </td>
                <td style={{ padding: "8px" }}>{v.heartRate}</td>
                <td style={{ padding: "8px" }}>{v.temperature}°C</td>
                <td style={{ padding: "8px" }}>{v.spo2}%</td>
                <td style={{ padding: "8px" }}>{v.weight}kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
          Vitals Trends
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={vitals}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="systolic" stroke="#2563eb" />
            <Line type="monotone" dataKey="diastolic" stroke="#f97316" />
            <Line type="monotone" dataKey="heartRate" stroke="#16a34a" />
            <Line type="monotone" dataKey="temperature" stroke="#dc2626" />
            <Line type="monotone" dataKey="spo2" stroke="#9333ea" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
