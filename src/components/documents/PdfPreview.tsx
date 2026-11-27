/// <reference types="vite/client" />
import React, { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    setPdf(null);
    setPage(1);
    setError("");
    const task = getDocument({
      url,
      enableXfa: false,
      disableAutoFetch: true,
      disableStream: true,
    });
    task.promise
      .then((document) => {
        if (active) setPdf(document);
      })
      .catch(() => {
        if (active)
          setError(
            "This PDF could not be rendered. Download it to view in your document software.",
          );
      });
    return () => {
      active = false;
      void task.destroy().catch(() => {});
    };
  }, [url]);
  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    setRendering(true);
    setError("");
    pdf
      .getPage(page)
      .then(async (documentPage) => {
        if (!active) return;
        const base = documentPage.getViewport({ scale: 1 });
        const scale = Math.min(
          zoom * 1.25,
          4096 / base.width,
          4096 / base.height,
        );
        const viewport = documentPage.getViewport({ scale });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          `PDF page ${page} of ${pdf.numPages}`,
        );
        render = documentPage.render({ canvas, viewport });
        await render.promise;
        if (active) {
          container.current?.replaceChildren(canvas);
          setRendering(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "This PDF page could not be rendered. You can still download the original.",
          );
          setRendering(false);
        }
      });
    return () => {
      active = false;
      render?.cancel();
    };
  }, [pdf, page, zoom]);
  return (
    <section aria-label="PDF preview">
      {error && <p role="alert">{error}</p>}
      {!pdf && !error && <p role="status">Loading PDF…</p>}
      {pdf && (
        <>
          <div className="dm-doc-actions">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous page
            </button>
            <span>
              Page {page} of {pdf.numPages}
            </span>
            <button
              disabled={page >= pdf.numPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next page
            </button>
            <label>
              PDF zoom
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.25"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
          </div>
          {rendering && <p role="status">Rendering PDF page…</p>}
        </>
      )}
      <div ref={container} className="dm-doc-pdf-canvas" />
    </section>
  );
}
