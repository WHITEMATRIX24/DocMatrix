import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileImage,
  FileText,
  FolderOpen,
  Image,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from "@/services/apiClient";
import { canClinic, getPermissionUser } from "@/services/permissions";
import "./patientDocuments.css";

const PdfPreview = lazy(() => import("./PdfPreview"));

export const DOCUMENT_CATEGORIES = [
  "Dental X-rays",
  "Clinical Photographs",
  "Medical Reports",
  "Dental Reports",
  "Scanned Documents",
  "Prescriptions",
  "Other Documents",
];
const PHOTO_CLASSES = [
  "Before Treatment",
  "During Treatment",
  "After Treatment",
  "General Clinical Photograph",
];
const TEETH = [1, 2, 3, 4].flatMap((q) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((t) => q * 10 + t),
);
type Appointment = {
  id: string;
  startTime: string;
  treatmentType?: string;
  visitType?: string;
};
type Document = {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  createdAt: string;
  documentDate?: string;
  uploadedById?: string;
  uploadedByName?: string;
  imagingType?: string;
  photographClass?: string;
  toothNumbers: number[];
  treatmentContext?: string;
  notes?: string;
  appointment?: Appointment;
  archivedAt?: string;
};
type QueueItem = {
  requestId: string;
  file: File;
  title: string;
  progress: number;
  status: "ready" | "uploading" | "saved" | "failed";
  error?: string;
};
const appointmentLabel = (a: Appointment) =>
  `${new Date(a.startTime).toLocaleString()} · ${a.treatmentType || a.visitType || "Appointment"}`;

export function PatientDocumentsPanel({
  patientId,
  appointmentId,
}: {
  patientId: string;
  appointmentId?: string;
}) {
  const base = `/patients/${encodeURIComponent(patientId)}`;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    imagingType: "",
    appointmentId: appointmentId || "",
    from: "",
    to: "",
    uploader: "",
    sort: "desc",
    archived: "false",
  });
  const [moreFilters, setMoreFilters] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [imagingType, setImagingType] = useState("OPG");
  const [photographClass, setPhotographClass] = useState(
    "General Clinical Photograph",
  );
  const [teeth, setTeeth] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [treatmentContext, setTreatmentContext] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [linkedAppointment, setLinkedAppointment] = useState(
    appointmentId || "",
  );
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ doc: Document; url: string } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const panel = useRef<HTMLElement>(null);
  const controller = useRef(new AbortController());
  const user = getPermissionUser();
  const canWrite = canClinic(user, "document.write");
  const canArchive = canClinic(user, "document.delete");

  useEffect(() => {
    controller.current = new AbortController();
    return () => controller.current.abort();
  }, [patientId, appointmentId, user?.clinicId]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const params = {
      ...filters,
      appointmentId: appointmentId || filters.appointmentId,
      from: filters.from
        ? new Date(`${filters.from}T00:00:00`).toISOString()
        : "",
      to: filters.to
        ? new Date(`${filters.to}T23:59:59.999`).toISOString()
        : "",
    };
    apiClient
      .get<Document[]>(`${base}/documents`, params, { signal: abort.signal })
      .then((data) => {
        if (!abort.signal.aborted) setDocuments(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setError(e.message);
          setDocuments([]);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [base, filters, appointmentId, revision, user?.clinicId]);
  useEffect(() => {
    const abort = new AbortController();
    apiClient
      .get<Appointment[]>(`${base}/document-appointments`, undefined, {
        signal: abort.signal,
      })
      .then((data) => {
        if (!abort.signal.aborted) setAppointments(data);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [base, user?.clinicId]);

  useEffect(() => {
    if (!open && !preview) return;
    const previous = window.document.activeElement as HTMLElement | null;
    const dialog = panel.current?.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLElement>("button, input, select")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setOpen(false);
        setPreview(null);
      }
      if (event.key !== "Tab" || !dialog) return;
      const nodes = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], iframe",
        ),
      ).filter((node) => !node.closest("fieldset:disabled"));
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && window.document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && window.document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.document.addEventListener("keydown", keydown);
    return () => {
      window.document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [open, preview, busy]);

  function addFiles(files: FileList | File[]) {
    const additions: QueueItem[] = Array.from(files).map((file) => ({
      requestId: crypto.randomUUID(),
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
      progress: 0,
      status:
        file.size > 25 * 1024 * 1024 ||
        !/\.(pdf|jpe?g|png|dcm|dicom)$/i.test(file.name) ||
        !file.size
          ? "failed"
          : "ready",
      error: !file.size
        ? "Empty file."
        : file.size > 25 * 1024 * 1024
          ? "Maximum file size is 25 MB."
          : !/\.(pdf|jpe?g|png|dcm|dicom)$/i.test(file.name)
            ? "Select PDF, JPG, PNG or DICOM."
            : undefined,
    }));
    setQueue((q) => [...q, ...additions]);
    setOpen(true);
  }
  const updateItem = (index: number, patch: Partial<QueueItem>) =>
    setQueue((q) =>
      q.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  async function upload() {
    setBusy(true);
    setNotice("");
    setError("");
    const signal = controller.current.signal;
    let saved = 0;
    try {
      for (let i = 0; i < queue.length && !signal.aborted; i++) {
        const item = queue[i];
        const invalidFile = !item.file.size
          ? "Empty file."
          : item.file.size > 25 * 1024 * 1024
            ? "Maximum file size is 25 MB."
            : !/\.(pdf|jpe?g|png|dcm|dicom)$/i.test(item.file.name)
              ? "Select PDF, JPG, PNG or DICOM."
              : "";
        if (invalidFile) {
          updateItem(i, { status: "failed", error: invalidFile });
          continue;
        }

        if (item.status === "saved") continue;
        if (!item.title.trim()) {
          updateItem(i, {
            status: "failed",
            error: "Document name is required.",
          });
          continue;
        }
        const data = new FormData();
        data.append("uploadRequestId", item.requestId);
        data.append("file", item.file);
        data.append("title", item.title.trim());
        data.append("category", category);
        if (notes) data.append("notes", notes);
        if (documentDate) data.append("documentDate", documentDate);
        if (appointmentId || linkedAppointment)
          data.append("appointmentId", appointmentId || linkedAppointment);
        if (category === "Dental X-rays")
          data.append("imagingType", imagingType);
        if (category === "Clinical Photographs")
          data.append("photographClass", photographClass);
        if (["Dental X-rays", "Clinical Photographs"].includes(category))
          data.append("toothNumbers", JSON.stringify(teeth));
        if (treatmentContext) data.append("treatmentContext", treatmentContext);
        updateItem(i, { status: "uploading", error: "", progress: 0 });
        try {
          await apiClient.upload(
            `${base}/documents`,
            data,
            (progress) => {
              if (!signal.aborted) updateItem(i, { progress });
            },
            signal,
          );
          if (signal.aborted) return;
          saved++;
          updateItem(i, { status: "saved", progress: 100 });
          setRevision((r) => r + 1);
        } catch (e: any) {
          if (!signal.aborted)
            updateItem(i, { status: "failed", error: e.message });
        }
      }
      if (!signal.aborted)
        setNotice(
          `${saved} document${saved === 1 ? "" : "s"} saved. Failed files can be retried.`,
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  async function view(doc: Document, download = false) {
    try {
      const signal = controller.current.signal;
      const blob = await apiClient.getBlob(
        `${base}/documents/${encodeURIComponent(doc.id)}/${download ? "download" : "preview"}`,
        signal,
      );
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = window.document.createElement("a");
        a.href = url;
        a.download = doc.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        setZoom(1);
        setPreview({ doc, url });
      }
    } catch (e: any) {
      if (!controller.current.signal.aborted) setError(e.message);
    }
  }
  async function archive(doc: Document) {
    try {
      if (doc.archivedAt)
        await apiClient.post(`${base}/documents/${doc.id}/restore`);
      else await apiClient.delete(`${base}/documents/${doc.id}`);
      if (!controller.current.signal.aborted) {
        setRevision((r) => r + 1);
        setNotice(
          doc.archivedAt
            ? "Document restored."
            : "Document archived. File and audit history retained.",
        );
      }
    } catch (e: any) {
      setError(e.message);
    }
  }
  const filter = (key: keyof typeof filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const activeFilterCount = [
    filters.imagingType,
    appointmentId ? "" : filters.appointmentId,
    filters.from,
    filters.to,
    filters.uploader,
    filters.archived === "true" ? "archived" : "",
  ].filter(Boolean).length;
  const hasFilters = !!(
    filters.search ||
    filters.category ||
    activeFilterCount
  );
  const resetFilters = () =>
    setFilters({
      search: "",
      category: "",
      imagingType: "",
      appointmentId: appointmentId || "",
      from: "",
      to: "",
      uploader: "",
      sort: "desc",
      archived: "false",
    });
  const closeUpload = () => {
    setOpen(false);
    setQueue((q) => q.filter((item) => item.status !== "saved"));
  };
  return (
    <section
      ref={panel}
      className="dm-documents"
      aria-label="Documents & Imaging"
    >
      <div className="dm-doc-toolbar">
        <div className="dm-doc-heading">
          <span className="dm-doc-heading-icon">
            <FolderOpen size={22} aria-hidden="true" />
          </span>
          <div>
            <h3>Documents & Imaging</h3>
            <p>
              {appointmentId
                ? "Documents linked to this appointment."
                : "Complete patient document history, newest first."}
            </p>
          </div>
        </div>
        <div className="dm-doc-toolbar-actions">
          {canWrite && (
            <button className="dm-doc-primary" onClick={() => setOpen(true)}>
              <UploadCloud size={17} aria-hidden="true" /> Upload Documents
            </button>
          )}
          {appointmentId && (
            <Link
              to={`/patients/${encodeURIComponent(patientId)}?tab=documents`}
            >
              Complete patient history{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      {error && (
        <p className="dm-doc-message is-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="dm-doc-message is-success" role="status">
          <CheckCircle2 size={17} aria-hidden="true" />
          {notice}
        </p>
      )}
      <div className="dm-doc-filter-panel">
        <div className="dm-doc-filter-main">
          <label className="dm-doc-search">
            Search by document name
            <span>
              <Search size={17} aria-hidden="true" />
              <input
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => filter("search", e.target.value)}
              />
            </span>
          </label>
          <label>
            Category
            <select
              value={filters.category}
              onChange={(e) => filter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Upload order
            <select
              value={filters.sort}
              onChange={(e) => filter("sort", e.target.value)}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
          <button
            className={`dm-doc-filter-toggle ${moreFilters ? "is-active" : ""}`}
            aria-expanded={moreFilters}
            aria-controls="document-history-filters"
            onClick={() => setMoreFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" /> Filters{" "}
            {activeFilterCount > 0 && (
              <span className="dm-doc-count">{activeFilterCount}</span>
            )}
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
        <div
          id="document-history-filters"
          className="dm-doc-filters dm-doc-advanced"
          hidden={!moreFilters}
        >
          <label>
            Imaging type
            <select
              value={filters.imagingType}
              onChange={(e) => filter("imagingType", e.target.value)}
            >
              <option value="">All imaging types</option>
              {["IOPA", "OPG", "CBCT", "Other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {!appointmentId && (
            <label>
              Appointment
              <select
                value={filters.appointmentId}
                onChange={(e) => filter("appointmentId", e.target.value)}
              >
                <option value="">All appointments</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {appointmentLabel(a)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Uploaded from
            <input
              type="date"
              value={filters.from}
              onChange={(e) => filter("from", e.target.value)}
            />
          </label>
          <label>
            Uploaded through
            <input
              type="date"
              value={filters.to}
              onChange={(e) => filter("to", e.target.value)}
            />
          </label>
          <label>
            Uploader
            <select
              value={filters.uploader}
              onChange={(e) => filter("uploader", e.target.value)}
            >
              <option value="">All uploaders</option>
              {Array.from(
                new Map(
                  documents
                    .filter((d) => d.uploadedById)
                    .map((d) => [d.uploadedById, d.uploadedByName]),
                ).entries(),
              ).map(([id, name]) => (
                <option key={id} value={id}>
                  {name || id}
                </option>
              ))}
              {filters.uploader &&
                !documents.some((d) => d.uploadedById === filters.uploader) && (
                  <option value={filters.uploader}>Selected uploader</option>
                )}
            </select>
          </label>
          {canArchive && (
            <label>
              Record status
              <select
                value={filters.archived}
                onChange={(e) => filter("archived", e.target.value)}
              >
                <option value="false">Active</option>
                <option value="true">Archived</option>
              </select>
            </label>
          )}
        </div>
        <div className="dm-doc-results">
          <span>
            {loading
              ? "Finding documents..."
              : `${documents.length} document${documents.length === 1 ? "" : "s"}${hasFilters ? " found" : ""}`}
          </span>
          {hasFilters && (
            <button className="dm-doc-text-button" onClick={resetFilters}>
              Clear filters
            </button>
          )}
          <span className="dm-doc-private">
            <ShieldCheck size={14} aria-hidden="true" /> Private patient records
          </span>
        </div>
      </div>
      {loading ? (
        <p className="dm-doc-loading" role="status">
          Loading documents…
        </p>
      ) : !error && !documents.length ? (
        <div className="dm-doc-empty">
          <span>
            <FolderOpen size={30} aria-hidden="true" />
          </span>
          <h4>
            {hasFilters
              ? "No matching documents"
              : "Your patient records, in one place"}
          </h4>
          <p>No documents match these filters.</p>
          <p>
            {hasFilters
              ? "Try a different search or clear your filters."
              : "Add scans, reports and clinical photos to build this patient's document history."}
          </p>
          {hasFilters ? (
            <button onClick={resetFilters}>Clear filters</button>
          ) : (
            canWrite && (
              <button className="dm-doc-primary" onClick={() => setOpen(true)}>
                <UploadCloud size={16} aria-hidden="true" /> Upload first
                document
              </button>
            )
          )}
        </div>
      ) : (
        <ol className="dm-doc-timeline">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className={`dm-doc-card ${doc.archivedAt ? "is-archived" : ""}`}
            >
              <div
                className={`dm-doc-file-icon ${doc.mimeType.startsWith("image/") ? "is-image" : doc.mimeType === "application/dicom" ? "is-dicom" : "is-pdf"}`}
              >
                {doc.mimeType.startsWith("image/") ? (
                  <FileImage size={25} aria-hidden="true" />
                ) : doc.mimeType === "application/dicom" ? (
                  <Image size={25} aria-hidden="true" />
                ) : (
                  <FileText size={25} aria-hidden="true" />
                )}
                <span>
                  {doc.mimeType === "application/dicom"
                    ? "DICOM"
                    : doc.fileName.split(".").pop()?.toUpperCase() || "FILE"}
                </span>
              </div>
              <div className="dm-doc-card-content">
                <div className="dm-doc-card-heading">
                  <h4>{doc.title}</h4>
                  <span className="dm-doc-badge">{doc.category}</span>
                  {doc.imagingType && (
                    <span className="dm-doc-badge is-teal">
                      {doc.imagingType}
                    </span>
                  )}
                  {doc.archivedAt && (
                    <span className="dm-doc-badge">Archived</span>
                  )}
                </div>
                <p className="dm-doc-file-info">
                  {doc.fileName} <span aria-hidden="true">&middot;</span>{" "}
                  {doc.fileSize} <span aria-hidden="true">&middot;</span>{" "}
                  {doc.mimeType}
                </p>
                {doc.notes && <p className="dm-doc-description">{doc.notes}</p>}
                <div className="dm-doc-clinical-meta">
                  {doc.photographClass && (
                    <span className="dm-doc-badge">{doc.photographClass}</span>
                  )}
                  {!!doc.toothNumbers?.length && (
                    <span>Teeth: {doc.toothNumbers.join(", ")}</span>
                  )}
                  {doc.documentDate && (
                    <span>Document date: {doc.documentDate.slice(0, 10)}</span>
                  )}
                  {doc.treatmentContext && (
                    <span>Treatment: {doc.treatmentContext}</span>
                  )}
                </div>
                {doc.appointment && (
                  <p className="dm-doc-appointment">
                    <CalendarDays size={14} aria-hidden="true" /> Appointment:{" "}
                    {appointmentLabel(doc.appointment)}
                  </p>
                )}
                <div className="dm-doc-card-footer">
                  <p>
                    Uploaded {new Date(doc.createdAt).toLocaleString()}{" "}
                    <span aria-hidden="true">&middot;</span>{" "}
                    {doc.uploadedByName || "Legacy uploader unavailable"}
                  </p>
                  <div className="dm-doc-actions">
                    {!doc.archivedAt && (
                      <>
                        <button onClick={() => view(doc)}>
                          <Search size={14} aria-hidden="true" />
                          Preview
                        </button>
                        <button onClick={() => view(doc, true)}>
                          <ArrowDownToLine size={14} aria-hidden="true" />
                          Download
                        </button>
                      </>
                    )}
                    {canArchive && (
                      <button
                        className="dm-doc-archive"
                        onClick={() => archive(doc)}
                      >
                        <Archive size={14} aria-hidden="true" />
                        {doc.archivedAt ? "Restore" : "Archive"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {open && (
        <div className="pat-modal-overlay">
          <div
            className="pat-modal dm-doc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Upload Documents"
          >
            <div className="dm-doc-modal-header">
              <span className="dm-doc-heading-icon">
                <UploadCloud size={23} aria-hidden="true" />
              </span>
              <div>
                <h3>Upload Documents</h3>
                <p>Add files and organise them for this patient.</p>
              </div>
              <button
                className="dm-doc-icon-button"
                aria-label="Close upload dialog"
                disabled={busy}
                onClick={closeUpload}
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void upload();
              }}
            >
              <fieldset disabled={busy}>
                <label
                  className={`dm-doc-drop ${dragging ? "is-dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (!busy) addFiles(e.dataTransfer.files);
                  }}
                >
                  <span className="dm-doc-drop-icon">
                    <UploadCloud size={27} aria-hidden="true" />
                  </span>
                  <strong>
                    Drop files here <span>or browse files</span>
                  </strong>
                  <span>PDF, JPG, PNG or DICOM &middot; Up to 25 MB each</span>

                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="dm-doc-section-title">
                  <h4>Document details</h4>
                  <p>These details apply to all files in this upload.</p>
                </div>
                <div className="dm-doc-filters">
                  <label>
                    Category
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setTeeth([]);
                      }}
                    >
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  {category === "Dental X-rays" && (
                    <label>
                      Imaging type
                      <select
                        value={imagingType}
                        onChange={(e) => setImagingType(e.target.value)}
                      >
                        {["IOPA", "OPG", "CBCT", "Other"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {category === "Clinical Photographs" && (
                    <label>
                      Photograph classification
                      <select
                        value={photographClass}
                        onChange={(e) => setPhotographClass(e.target.value)}
                      >
                        {PHOTO_CLASSES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Appointment (optional)
                    <select
                      disabled={!!appointmentId}
                      value={appointmentId || linkedAppointment}
                      onChange={(e) => setLinkedAppointment(e.target.value)}
                    >
                      <option value="">No appointment</option>
                      {appointments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {appointmentLabel(a)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Document date (optional)
                    <input
                      type="date"
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Treatment context (optional)
                    <input
                      maxLength={2000}
                      value={treatmentContext}
                      onChange={(e) => setTreatmentContext(e.target.value)}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      maxLength={10000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </div>
                {["Dental X-rays", "Clinical Photographs"].includes(
                  category,
                ) && (
                  <fieldset className="dm-doc-teeth">
                    <legend>Teeth (optional, permanent FDI)</legend>
                    {TEETH.map((t) => (
                      <label key={t}>
                        <input
                          type="checkbox"
                          checked={teeth.includes(t)}
                          onChange={(e) =>
                            setTeeth((v) =>
                              e.target.checked
                                ? [...v, t]
                                : v.filter((x) => x !== t),
                            )
                          }
                        />
                        {t}
                      </label>
                    ))}
                  </fieldset>
                )}
                {queue.map((item, i) => (
                  <div
                    className="dm-doc-queue"
                    key={i}
                    data-status={item.status}
                  >
                    <label>
                      Document name
                      <input
                        required
                        maxLength={200}
                        value={item.title}
                        disabled={item.status === "saved"}
                        onChange={(e) =>
                          updateItem(i, { title: e.target.value })
                        }
                      />
                    </label>
                    <p>
                      <FileText size={14} aria-hidden="true" /> {item.file.name}{" "}
                      <span className="dm-doc-badge">
                        {item.status === "ready"
                          ? "Ready to upload"
                          : item.status === "saved"
                            ? "Uploaded"
                            : item.status === "uploading"
                              ? "Uploading..."
                              : "Needs attention"}
                      </span>
                    </p>
                    <progress
                      max={100}
                      value={item.progress}
                      aria-label={`Upload progress ${item.file.name}`}
                    />
                    {item.error && <p role="alert">{item.error}</p>}
                    {item.status !== "saved" && (
                      <button
                        type="button"
                        onClick={() =>
                          setQueue((q) => q.filter((_, n) => n !== i))
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <div className="dm-doc-upload-action">
                  <span>
                    {queue.length} file{queue.length === 1 ? "" : "s"} selected
                  </span>
                  <div className="dm-doc-actions">
                    <button type="button" onClick={closeUpload}>
                      Close
                    </button>
                    <button
                      className="dm-doc-primary"
                      type="submit"
                      disabled={!queue.some((q) => q.status !== "saved")}
                    >
                      {queue.some((q) => q.status === "failed")
                        ? "Retry failed / Upload remaining"
                        : "Upload"}
                    </button>
                  </div>
                </div>
              </fieldset>
            </form>
            {busy && (
              <p role="status">
                Uploading and scanning… Please wait for confirmation.
              </p>
            )}
          </div>
        </div>
      )}
      {preview && (
        <div className="pat-modal-overlay">
          <div
            className="pat-modal dm-doc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Document preview"
          >
            <div className="dm-doc-modal-header">
              <span className="dm-doc-heading-icon">
                <FileText size={23} aria-hidden="true" />
              </span>
              <div>
                <h3>{preview.doc.title}</h3>
                <p>
                  {preview.doc.category} &middot; {preview.doc.fileSize}
                </p>
              </div>
              <button
                className="dm-doc-icon-button"
                aria-label="Close preview"
                onClick={() => setPreview(null)}
              >
                <X size={19} aria-hidden="true" />
                <span className="dm-doc-sr-only">Close preview</span>
              </button>
            </div>
            {preview.doc.mimeType.startsWith("image/") ? (
              <>
                <label>
                  Zoom
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.25"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                </label>
                <div className="dm-doc-image">
                  <img
                    src={preview.url}
                    alt={preview.doc.title}
                    style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
                  />
                </div>
              </>
            ) : preview.doc.mimeType === "application/pdf" ? (
              <Suspense fallback={<p role="status">Loading PDF viewer�</p>}>
                <PdfPreview url={preview.url} />
              </Suspense>
            ) : (
              <p>
                {preview.doc.fileName} · {preview.doc.mimeType} ·{" "}
                {preview.doc.fileSize}. A DICOM viewer is not available;
                download to view in your clinical imaging software.
              </p>
            )}
            <div className="dm-doc-preview-footer">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>Private patient document</span>
              <button
                className="dm-doc-primary"
                onClick={() => view(preview.doc, true)}
              >
                <ArrowDownToLine size={15} aria-hidden="true" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
