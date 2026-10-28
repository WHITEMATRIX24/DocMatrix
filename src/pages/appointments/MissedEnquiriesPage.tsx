import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Inbox } from 'lucide-react'

const enquiries = [
  { name: 'Ananya Pillai', request: 'New patient · Cleaning', time: 'Today, 9:42 AM' },
  { name: 'Vivek Menon', request: 'Existing patient · Tooth pain', time: 'Today, 9:18 AM' },
  { name: 'Sara Thomas', request: 'New patient · Consultation', time: 'Yesterday, 5:36 PM' },
]

export const MissedEnquiriesPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section className="appointment-simple-panel" data-testid="feature-page-appt.enquiries">
      <div className="appointment-simple-heading">
        <div className="appointment-simple-heading-icon"><Inbox size={17} /></div>
        <div><h2>Online enquiries</h2><p>3 requests waiting for a response</p></div>
      </div>
      <div className="appointment-enquiry-list">
        {enquiries.map((enquiry) => (
          <article className="appointment-enquiry-row" key={enquiry.name}>
            <div className="appointment-enquiry-avatar">{enquiry.name.split(' ').map((part) => part[0]).join('')}</div>
            <div className="appointment-enquiry-details"><strong>{enquiry.name}</strong><span>{enquiry.request} · {enquiry.time}</span></div>
            <button onClick={() => navigate('/appointments/new')}>Book visit <ArrowRight size={14} /></button>
          </article>
        ))}
      </div>
    </section>
  )
}

export default MissedEnquiriesPage
