import React, { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useClinicData, ClinicalNoteRecord } from '../../services/clinicStore';
import { ClinicalNoteModal } from '../../components/clinical/ClinicalNoteModal';
import './clinicalNotes.css';

export const RecordConsultationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { clinicalNotes = [] } = useClinicData();

  const patientIdParam = searchParams.get('patientId') || undefined;

  const initialNote = useMemo(() => {
    if (!id) return null;
    return clinicalNotes.find((n) => n.id === id) || null;
  }, [id, clinicalNotes]);

  const handleClose = () => {
    if (patientIdParam) {
      navigate(`/patients/${patientIdParam}/notes`);
    } else {
      navigate('/clinical/notes');
    }
  };

  const handleSaved = (savedNote: ClinicalNoteRecord) => {
    if (patientIdParam) {
      navigate(`/patients/${patientIdParam}/notes`, { state: { savedNoteId: savedNote.id } });
    } else {
      navigate('/clinical/notes', { state: { savedNoteId: savedNote.id } });
    }
  };

  return (
    <ClinicalNoteModal
      isPage
      initialNote={initialNote}
      defaultPatientId={patientIdParam}
      onClose={handleClose}
      onSaved={handleSaved}
    />
  );
};

export default RecordConsultationPage;
