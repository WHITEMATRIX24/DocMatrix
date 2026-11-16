# DocMatrix — Reports & Analytics Metric Definitions & Formulas

This document provides mathematical and accounting specifications for all clinical, operational, and financial metrics computed in DocMatrix Reports.

---

## 1. Financial Metrics

### 1.1 Collected Revenue (`collected`)
- **Definition**: The total net cash/electronic payment received by the clinic within the specified date range.
- **Formula**:
  $$\text{Collected} = \sum (\text{amount of PAYMENTS received within range}) - \sum (\text{amount of REFUNDS within range})$$
- **Database Model**: `InvoicePayment`
- **Filter**:
  ```ts
  where: {
    invoice: { clinicId },
    receivedAt: { gte: startDate, lte: endDate }
  }
  ```
- **Accounting Note**: Realized revenue is recognized when payments are received, regardless of when the invoice was initially generated.

### 1.2 Billed Revenue (`billed`)
- **Definition**: The sum total value of active invoices issued within the specified date range.
- **Formula**:
  $$\text{Billed} = \sum (\text{totalAmount of Invoices where status } \neq \text{VOID})$$
- **Database Model**: `Invoice`
- **Filter**:
  ```ts
  where: {
    clinicId,
    status: { not: InvoiceStatus.VOID },
    issueDate: { gte: startDate, lte: endDate }
  }
  ```

### 1.3 Unpaid Dues on Billed Period (`unpaid`)
- **Definition**: The remaining outstanding balance due on invoices issued within the period.
- **Formula**:
  $$\text{Unpaid} = \sum (\text{balance of Invoices issued in period where status } \neq \text{VOID})$$
- **Database Model**: `Invoice`

### 1.4 Average Bill Value (`averageBill`)
- **Formula**:
  $$\text{Average Bill} = \begin{cases} \frac{\text{Billed}}{\text{Invoice Count}} & \text{if Invoice Count} > 0 \\ 0 & \text{otherwise} \end{cases}$$

### 1.5 Payment Mode Distribution
- **Grouping**: Grouped by `mode` (`CASH`, `CARD`, `UPI`, `NET_BANKING`, `CHEQUE`).
- **Percentage Formula**:
  $$\text{Mode Pct} = \frac{\text{Mode Amount}}{\text{Total Collected}} \times 100$$

---

## 2. Clinical & Operational Metrics

### 2.1 Visits Completed (`visitsCompleted`)
- **Definition**: Total number of appointments marked with status `COMPLETED` within the date range.
- **Database Model**: `Appointment`
- **Filter**:
  ```ts
  where: {
    clinicId,
    status: 'COMPLETED',
    startTime: { gte: startDate, lte: endDate }
  }
  ```

### 2.2 Appointment Attendance Rate (`attendedPct`)
- **Formula**:
  $$\text{Attendance Rate} = \frac{\text{Visits Completed}}{\text{Visits Completed} + \text{Cancelled} + \text{No-Shows}} \times 100$$
- **Note**: Only appointments that reached a terminal outcome are included in the denominator; open/scheduled appointments are excluded.

### 2.3 New vs Returning Patients
- **New Patient**: A patient whose very first completed appointment at the clinic occurred within the current report range.
- **Returning Patient**: A patient seen within the current report range who had at least one completed appointment prior to the range start date.
- **Integrity Rule**:
  $$\text{Patients Treated} = \text{New Patients} + \text{Returning Patients}$$

---

## 3. Treatment Plans Metrics

### 3.1 Treatment Plans Made (`plansMade`)
- **Definition**: Total count of treatment plans created within the date range.
- **Database Model**: `TreatmentPlan`
- **Filter**: `createdAt` within `[startDate, endDate]`.

### 3.2 Treatment Plan Acceptance & Completion (`plansCompletedPct`)
- **Formula**:
  $$\text{Completion Rate} = \frac{\text{Plans Completed}}{\text{Plans Made}} \times 100$$
- **Completed Value**: Sum of `totalEstimatedCost` for plans with status `COMPLETED`.

---

## 4. Patient Follow-up Classifications

### 4.1 Missed Visits to Rebook
- **Criteria**:
  1. Appointment within range had status `CANCELLED` or `NO_SHOW`.
  2. The patient has **no subsequent** appointments scheduled or confirmed after the missed date.

### 4.2 Unfinished Treatment Plans
- **Criteria**:
  1. Patient has an active treatment plan with status in `['PROPOSED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING']`.
  2. Patient has no future appointments booked.

### 4.3 180-Day Recalls
- **Criteria**:
  1. Patient's last completed visit was $> 180$ days ago.
  2. Patient has no active treatment plans.
  3. Patient has no future appointments booked.

