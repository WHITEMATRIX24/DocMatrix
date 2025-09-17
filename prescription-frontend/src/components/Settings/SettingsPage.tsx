// pages/settings.tsx (if Next.js Pages router)
// or app/settings/page.tsx (if App Router)

import React from "react";
import "./settings.css";

const SettingsPage = () => {
  return (
    <div className="settings-container">
      <h2 className="settings-title">Settings</h2>

      {/* Profile Section */}
      <div className="settings-section">
        <h3>Profile</h3>
        <label>
          Name:
          <input type="text" placeholder="Enter your name" />
        </label>
        <label>
          Email:
          <input type="email" placeholder="Enter your email" />
        </label>
        <label>
          Phone:
          <input type="text" placeholder="Enter phone number" />
        </label>
        <label>
          Profile Picture:
          <input type="file" />
        </label>
      </div>

      {/* Account Section */}
      <div className="settings-section">
        <h3>Account</h3>
        <label>
          Password:
          <input type="password" placeholder="New password" />
        </label>
        <label>
          Notifications:
          <select>
            <option>Email</option>
            <option>SMS</option>
            <option>Push</option>
          </select>
        </label>
        <label>
          Language:
          <select>
            <option>English</option>
            <option>Hindi</option>
            <option>Malayalam</option>
          </select>
        </label>
      </div>

      {/* Preferences */}
      <div className="settings-section">
        <h3>Preferences</h3>
        <label>
          Theme:
          <select>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </label>
        <label>
          Default Prescription View:
          <select>
            <option>List View</option>
            <option>Card View</option>
          </select>
        </label>
      </div>

      {/* Save Button */}
      <div className="settings-footer">
        <button className="save-btn">Save Changes</button>
      </div>
    </div>
  );
};

export default SettingsPage;
