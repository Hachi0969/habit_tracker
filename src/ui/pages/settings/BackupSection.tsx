import { useRef, useState } from "react";
import type { ImportPreview } from "../../../application/ImportBackupUseCase.ts";
import { Button, Card } from "../../components/primitives.tsx";
import { useImport } from "../../hooks/useData.ts";
import { useServices } from "../../ServicesContext.tsx";

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function PreviewReport({ preview }: { preview: ImportPreview }) {
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
      <p className="font-medium text-ink">
        {preview.format === "legacy" ? "Old Life Dashboard data" : "v2 backup"}: {preview.totalRows}{" "}
        rows
      </p>
      <ul className="mt-1 space-y-0.5 text-muted">
        <li>✓ {preview.valid.length} valid days will be imported</li>
        {preview.overwrites.length > 0 && (
          <li>↻ {preview.overwrites.length} will replace days you already have</li>
        )}
        {preview.duplicates.length > 0 && (
          <li>
            ⚠ {preview.duplicates.length} dates appear twice in the file; the last row is used
          </li>
        )}
        {preview.invalid.length > 0 && (
          <li>✗ {preview.invalid.length} invalid rows will be skipped:</li>
        )}
      </ul>
      {preview.invalid.length > 0 && (
        <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-danger">
          {preview.invalid.map((p) => (
            <li key={p.row}>
              Row {p.row} ({p.date}): {p.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** UC7: export a backup; import old or v2 data with a preview first. */
export function BackupSection() {
  const { exportBackup, legacyReader } = useServices();
  const { preview, commit } = useImport();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startPreview = (text: string) => {
    setMessage(null);
    commit.reset();
    preview.mutate(text);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    startPreview(await file.text());
    if (fileInput.current) fileInput.current.value = "";
  };

  const onLegacyInBrowser = () => {
    const text = legacyReader.readFromStorage(window.localStorage);
    if (!text) {
      setMessage(
        "No old data in this browser. Open the old app, use its Export button, then import that file here.",
      );
      return;
    }
    startPreview(text);
  };

  const onExport = async () => {
    const { fileName, json, count } = await exportBackup.execute();
    download(fileName, json);
    setMessage(`Exported ${count} days to ${fileName}.`);
  };

  return (
    <Card title="Backup and import">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onExport}>Export JSON</Button>
        <Button onClick={() => fileInput.current?.click()}>Import file…</Button>
        <Button variant="ghost" onClick={onLegacyInBrowser}>
          Find old app data in this browser
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        Importing never deletes your old app's data. Check the counts before you confirm.
      </p>

      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      {preview.isError && <p className="mt-3 text-sm text-danger">{preview.error.message}</p>}

      {preview.data && !commit.isSuccess && (
        <>
          <PreviewReport preview={preview.data} />
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              disabled={preview.data.valid.length === 0 || commit.isPending}
              onClick={() => commit.mutate(preview.data)}
            >
              {commit.isPending ? "Importing…" : `Import ${preview.data.valid.length} days`}
            </Button>
            <Button variant="ghost" onClick={() => preview.reset()}>
              Cancel
            </Button>
          </div>
          {commit.isError && <p className="mt-2 text-sm text-danger">{commit.error.message}</p>}
        </>
      )}
      {commit.isSuccess && <p className="mt-3 text-sm text-good">Imported {commit.data} days ✓</p>}
    </Card>
  );
}
