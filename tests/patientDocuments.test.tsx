import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PatientDocumentsPanel } from "../src/components/documents/PatientDocumentsPanel";
import { apiClient } from "../src/services/apiClient";
vi.mock("../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    upload: vi.fn(),
    getBlob: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));
vi.mock("../src/services/permissions", () => ({
  getPermissionUser: () => ({ role: "RECEPTIONIST", clinicId: "c" }),
  canClinic: (_u: unknown, op: string) => op !== "document.delete",
}));
const appointment = {
  id: "a",
  startTime: "2026-11-27T10:00:00Z",
  treatmentType: "Restoration",
};
function mount(appointmentId?: string) {
  return render(
    <MemoryRouter>
      <PatientDocumentsPanel
        patientId="patient"
        appointmentId={appointmentId}
      />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(async (path: string) =>
    path.endsWith("document-appointments") ? [appointment] : [],
  );
  vi.mocked(apiClient.upload).mockResolvedValue({ id: "doc" });
});
function addFile(name = "scan.pdf") {
  fireEvent.change(document.querySelector("input[type=file]")!, {
    target: {
      files: [new File(["%PDF-1.4"], name, { type: "application/pdf" })],
    },
  });
}
describe("Documents and imaging workflow", () => {
  it("uploads multiple files with names, imaging metadata and selected patient appointment", async () => {
    mount();
    fireEvent.click(screen.getByText("Upload Documents"));
    await screen.findAllByText(/Restoration/);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(dialog.querySelector("select")!, {
      target: { value: "Dental X-rays" },
    });
    fireEvent.change(screen.getByLabelText("Appointment (optional)"), {
      target: { value: "a" },
    });
    fireEvent.click(screen.getByLabelText("11"));
    addFile();
    addFile("scan2.pdf");
    fireEvent.click(
      screen.getByRole("button", { name: "Upload", exact: true }),
    );
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledTimes(2));
    const [path, form] = vi.mocked(apiClient.upload).mock.calls[0];
    expect(path).toBe("/patients/patient/documents");
    expect((form as FormData).get("appointmentId")).toBe("a");
    expect((form as FormData).get("toothNumbers")).toBe("[11]");
    expect((form as FormData).get("imagingType")).toBe("OPG");
    expect((form as FormData).get("file")).toBeInstanceOf(File);
    await screen.findByText(/2 documents saved/);
  });
  it("automatically scopes appointment history and upload association", async () => {
    mount("a");
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/patients/patient/documents",
        expect.objectContaining({ appointmentId: "a" }),
        expect.anything(),
      ),
    );
    fireEvent.click(screen.getByText("Upload Documents"));
    await screen.findAllByText(/Restoration/);
    expect(screen.getByLabelText("Appointment (optional)")).toBeDisabled();
    addFile();
    fireEvent.click(
      screen.getByRole("button", { name: "Upload", exact: true }),
    );
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    expect(
      (vi.mocked(apiClient.upload).mock.calls[0][1] as FormData).get(
        "appointmentId",
      ),
    ).toBe("a");
    expect(screen.getByText("Complete patient history")).toHaveAttribute(
      "href",
      "/patients/patient?tab=documents",
    );
  });
  it("shows failure, retries with same upload identity and confirms only after persistence", async () => {
    vi.mocked(apiClient.upload).mockRejectedValueOnce(
      new Error("Scanner unavailable"),
    );
    mount();
    fireEvent.click(screen.getByText("Upload Documents"));
    addFile();
    fireEvent.click(
      screen.getByRole("button", { name: "Upload", exact: true }),
    );
    await screen.findByText("Scanner unavailable");
    const first = (
      vi.mocked(apiClient.upload).mock.calls[0][1] as FormData
    ).get("uploadRequestId");
    fireEvent.click(screen.getByText("Retry failed / Upload remaining"));
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledTimes(2));
    expect(
      (vi.mocked(apiClient.upload).mock.calls[1][1] as FormData).get(
        "uploadRequestId",
      ),
    ).toBe(first);
    await screen.findByText(/1 document saved/);
  });
  it("reports unsupported files and permits removing failures", async () => {
    mount();
    fireEvent.click(screen.getByText("Upload Documents"));
    addFile("script.exe");
    expect(screen.getByText("Select PDF, JPG, PNG or DICOM.")).toBeVisible();
    fireEvent.click(screen.getByText("Remove"));
    expect(screen.queryByText("script.exe")).toBeNull();
  });
  it("filters the backend by category and hides retention controls from reception", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Medical Reports" },
    });
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/patients/patient/documents",
        expect.objectContaining({ category: "Medical Reports" }),
        expect.anything(),
      ),
    );
    expect(screen.queryByText("Archive")).toBeNull();
  });
  it("uses authenticated preview blobs and shows DICOM metadata without a public URL", async () => {
    const doc = {
      id: "d",
      title: "DICOM scan",
      category: "Dental X-rays",
      fileName: "scan.dcm",
      fileSize: "1 MB",
      mimeType: "application/dicom",
      createdAt: "2026-11-27T10:00:00Z",
      toothNumbers: [11],
      uploadedByName: "Doctor",
    };
    vi.mocked(apiClient.get).mockImplementation(async (path: string) =>
      path.endsWith("document-appointments") ? [] : [doc],
    );
    vi.mocked(apiClient.getBlob).mockResolvedValue(
      new Blob(["dicom"], { type: "application/dicom" }),
    );
    URL.createObjectURL = vi.fn(() => "blob:private-preview");
    URL.revokeObjectURL = vi.fn();
    mount();
    fireEvent.click(await screen.findByText("Preview"));
    await screen.findByRole("dialog", { name: "Document preview" });
    expect(apiClient.getBlob).toHaveBeenCalledWith(
      "/patients/patient/documents/d/preview",
      expect.any(AbortSignal),
    );
    expect(screen.getByText(/A DICOM viewer is not available/)).toBeVisible();
    fireEvent.click(screen.getByText("Close preview"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-preview");
  });
  it("accepts drag-and-drop and provides photograph classification without X-ray metadata", async () => {
    mount();
    fireEvent.click(screen.getByText("Upload Documents"));
    fireEvent.change(screen.getByRole("dialog").querySelector("select")!, {
      target: { value: "Clinical Photographs" },
    });
    expect(screen.getByLabelText("Photograph classification")).toBeVisible();
    fireEvent.drop(screen.getByText(/Drop files here/), {
      dataTransfer: {
        files: [new File(["png"], "photo.png", { type: "image/png" })],
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Upload", exact: true }),
    );
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get("photographClass")).toBe("General Clinical Photograph");
    expect(form.has("imagingType")).toBe(false);
  });
  it("reports oversized files before attempting storage", async () => {
    mount();
    fireEvent.click(screen.getByText("Upload Documents"));
    const file = new File(["pdf"], "large.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 26 * 1024 * 1024 });
    fireEvent.change(document.querySelector("input[type=file]")!, {
      target: { files: [file] },
    });
    expect(screen.getByText("Maximum file size is 25 MB.")).toBeVisible();
    expect(apiClient.upload).not.toHaveBeenCalled();
  });
});
