// pages/appointments.tsx (Next.js Pages router)
// or app/appointments/page.tsx (App Router)

import React, { useState } from "react";
import "./Appointment.css";

interface Appointment {
  id: number;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
}
import { useNavigate } from "react-router-dom";

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 1,
      patientName: "John Doe",
      doctorName: "Dr. Smith",
      date: "2025-09-20",
      time: "10:30 AM",
      status: "Scheduled",
    },
    {
      id: 2,
      patientName: "Mary Johnson",
      doctorName: "Dr. Emily",
      date: "2025-09-22",
      time: "2:00 PM",
      status: "Scheduled",
    },
  ]);

  const [newAppointment, setNewAppointment] = useState({
    patientName: "",
    doctorName: "",
    date: "",
    time: "",
  });
  const navigate = useNavigate();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewAppointment({ ...newAppointment, [e.target.name]: e.target.value });
  };

  const handleAddAppointment = () => {
    if (!newAppointment.patientName || !newAppointment.doctorName || !newAppointment.date || !newAppointment.time) {
      alert("Please fill all fields");
      return;
    }

    const newEntry: Appointment = {
      id: appointments.length + 1,
      ...newAppointment,
      status: "Scheduled",
    } as Appointment;

    setAppointments([...appointments, newEntry]);
    setNewAppointment({ patientName: "", doctorName: "", date: "", time: "" });
  };

  const handleCancel = (id: number) => {
    setAppointments(
      appointments.map((appt) =>
        appt.id === id ? { ...appt, status: "Cancelled" } : appt
      )
    );
  };

  return (
    <div className="appointments-container">
       {/* 🔹 Page Header */}
      <div className="appointments-header">
        <div className="header-content">
          <div className="title-wrapper">
            <span className="header-icon">📊</span>
            <div>
              <h3 className="header-title">Appointments</h3>
              <p className="header-subtitle">
              Schedule and  manage patient Appointments
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
      {/* <h2 className="appointments-title">Appointments</h2> */}
<div className="appointments-content">
  
      {/* Form Section */}
      <div className="appointment-form">
        <h3>Schedule New Appointment</h3>
        <input
          type="text"
          name="patientName"
          placeholder="Patient Name"
          value={newAppointment.patientName}
          onChange={handleChange}
        />
        <input
          type="text"
          name="doctorName"
          placeholder="Doctor Name"
          value={newAppointment.doctorName}
          onChange={handleChange}
        />
        <input
          type="date"
          name="date"
          value={newAppointment.date}
          onChange={handleChange}
        />
        <input
          type="time"
          name="time"
          value={newAppointment.time}
          onChange={handleChange}
        />
        <button onClick={handleAddAppointment}>Add Appointment</button>
      </div>

      {/* Appointment List */}
      <div className="appointment-list">
        <h3>Upcoming Appointments</h3>
        {appointments.length === 0 ? (
          <p>No appointments scheduled.</p>
        ) : (
          appointments.map((appt) => (
            <div key={appt.id} className="appointment-card">
              <p>
                <strong>Patient:</strong> {appt.patientName}
              </p>
              <p>
                <strong>Doctor:</strong> {appt.doctorName}
              </p>
              <p>
                <strong>Date:</strong> {appt.date}
              </p>
              <p>
                <strong>Time:</strong> {appt.time}
              </p>
              <p className={`status ${appt.status.toLowerCase()}`}>
                <strong>Status:</strong> {appt.status}
              </p>
              {appt.status === "Scheduled" && (
                <button
                  className="cancel-btn"
                  onClick={() => handleCancel(appt.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          ))
        )}
      </div>
</div>
    </div>
  );
};

export default AppointmentsPage;
