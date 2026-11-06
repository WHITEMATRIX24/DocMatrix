import React, { useMemo, useState } from 'react'
import { Plus, Trash2, WalletCards } from 'lucide-react'
import type { PaymentMode } from '@/services/clinicStore'
import { EXPENSE_CATEGORIES, addExpense, deleteExpense, useBillingData, type ExpenseCategory } from '@/services/billingStore'
import { PAYMENT_MODES, inr, localDate, prettyDate } from './BillingShared'

export const ExpensesPage: React.FC = () => {
  const { expenses } = useBillingData()
  const [month, setMonth] = useState(localDate().slice(0, 7))
  const [date, setDate] = useState(localDate())
  const [category, setCategory] = useState<ExpenseCategory>('Dental supplies')
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<PaymentMode>('Cash')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthRows = useMemo(() => expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)), [expenses, month])
  const monthTotal = monthRows.reduce((s, e) => s + e.amount, 0)
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    monthRows.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [monthRows])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!(value > 0) || !description.trim() || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await addExpense({ date, category, description: description.trim(), vendor: vendor.trim() || undefined, amount: value, mode })
      setDescription('')
      setVendor('')
      setAmount('')
      if (!date.startsWith(month)) setMonth(date.slice(0, 7))
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, desc: string, val: number) => {
    if (!window.confirm(`Delete "${desc}" (${inr(val)})?`)) return
    try {
      await deleteExpense(id)
    } catch (err: any) {
      alert(err?.message || 'Failed to delete expense.')
    }
  }

  return (
    <div className="bill-page" data-testid="feature-page-bill.expenses">
      <form className="bill-card bill-expense-form" onSubmit={submit}>
        <h2 className="bill-section-title">Add expense</h2>
        <div className="bill-form-grid">
          <label className="bill-field">Date<input type="date" value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="bill-field">Category
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="bill-field bill-span-2">What for<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Composite kit refill" required /></label>
          <label className="bill-field">Paid to <span className="bill-optional">optional</span><input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor / lab" /></label>
          <label className="bill-field">Amount ₹<input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
          <div className="bill-field">Paid by
            <div className="bill-mode-group">
              {PAYMENT_MODES.map(({ id, icon: Icon }) => (
                <label key={id} className={`bill-mode${mode === id ? ' is-on' : ''}`}>
                  <input type="radio" name="expmode" checked={mode === id} onChange={() => setMode(id)} />
                  <Icon size={14} /> {id}
                </label>
              ))}
            </div>
          </div>
          <div className="bill-field bill-form-submit">
            {error && <p className="bill-error">{error}</p>}
            <button type="submit" className="patient-intake-primary" disabled={isSubmitting}>
              <Plus size={15} /> {isSubmitting ? 'Adding...' : 'Add expense'}
            </button>
          </div>
        </div>
      </form>

      <div className="bill-toolbar">
        <label className="bill-month">
          Month <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        <p className="bill-summary-line">{monthRows.length} expense{monthRows.length === 1 ? '' : 's'} · <strong>{inr(monthTotal)}</strong></p>
      </div>

      {byCategory.length > 0 && (
        <div className="bill-cat-bars">
          {byCategory.map(([cat, value]) => (
            <div key={cat} className="bill-mode-bar">
              <span>{cat}</span>
              <div className="bill-bar-track"><div className="bill-bar-fill bill-bar-fill-alt" style={{ width: `${(value / monthTotal) * 100}%` }} /></div>
              <strong>{inr(value)}</strong>
            </div>
          ))}
        </div>
      )}

      {monthRows.length ? (
        <div className="bill-table-wrap">
          <table className="bill-table">
            <thead><tr><th>Date</th><th>Category</th><th>Details</th><th>Mode</th><th className="r">Amount</th><th /></tr></thead>
            <tbody>
              {monthRows.map((e) => (
                <tr key={e.id}>
                  <td>{prettyDate(e.date)}</td>
                  <td>{e.category}</td>
                  <td>{e.description}{e.vendor && <small className="bill-sub">{e.vendor}</small>}</td>
                  <td>{e.mode}</td>
                  <td className="r"><strong>{inr(e.amount)}</strong></td>
                  <td className="r">
                    <button className="bill-icon-btn" aria-label={`Delete ${e.description}`} onClick={() => handleDelete(e.id, e.description, e.amount)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bill-empty">
          <WalletCards size={22} />
          <h2>No expenses this month</h2>
          <p>Log lab bills, supplies, rent and salaries to see the clinic's real net.</p>
        </div>
      )}
    </div>
  )
}

export default ExpensesPage
