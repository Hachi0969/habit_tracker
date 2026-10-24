import { formatDistanceToNow, parseISO } from "date-fns";
import { useState } from "react";
import { ValidationError } from "../../../application/ValidationError.ts";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  FieldError,
  Loading,
} from "../../components/primitives.tsx";
import { useDevices, useRegisterDevice, useRevokeDevice } from "../../hooks/useData.ts";
import { useServices } from "../../ServicesContext.tsx";

/** Shown once after registering. Closing it forgets the token for good. */
function NewToken({ token, onDone }: { token: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="alert" className="mt-3 rounded-xl border border-accent/50 bg-accent/10 p-3 text-sm">
      <p className="font-medium text-ink">Device token (shown only once)</p>
      <p className="text-xs text-muted">
        Put it in <code>firmware/esp32-display/include/secrets.h</code> as DEVICE_TOKEN. Only a hash
        is stored, so it cannot be shown again.
      </p>
      <code className="mt-2 block rounded-lg bg-surface p-2 text-xs break-all select-all">
        {token}
      </code>
      <div className="mt-2 flex gap-2">
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(token);
            setCopied(true);
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          I saved it
        </Button>
      </div>
    </div>
  );
}

export function DevicesSection() {
  const { mode } = useServices();
  const devices = useDevices();
  const register = useRegisterDevice();
  const revoke = useRevokeDevice();
  const [name, setName] = useState("desk ESP32");
  const [token, setToken] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (mode === "local") {
    return (
      <Card title="Desk display (ESP32)">
        <p className="text-sm text-muted">
          The desk display reads from the cloud, so it needs Supabase. Connect Supabase to register
          a device.
        </p>
      </Card>
    );
  }

  const nameError =
    register.error instanceof ValidationError ? register.error.fieldErrors.name : undefined;

  return (
    <Card title="Desk display (ESP32)">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate(name, { onSuccess: (r) => setToken(r.token) });
        }}
      >
        <label htmlFor="device-name" className="sr-only">
          Device name
        </label>
        <input
          id="device-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 text-base text-ink"
        />
        <Button type="submit" variant="primary" disabled={register.isPending}>
          Register
        </Button>
      </form>
      <FieldError id="device-name-error" message={nameError} />
      {register.isError && !nameError && (
        <p className="mt-2 text-sm text-danger">{register.error.message}</p>
      )}
      {token && <NewToken token={token} onDone={() => setToken(null)} />}

      <div className="mt-4">
        {devices.isPending ? (
          <Loading />
        ) : devices.isError ? (
          <ErrorState error={devices.error} onRetry={() => devices.refetch()} />
        ) : devices.data.length === 0 ? (
          <Empty title="No devices yet" />
        ) : (
          <ul className="divide-y divide-line">
            {devices.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">{d.name}</p>
                  <p className="text-xs text-muted">
                    {d.revokedAt
                      ? "Revoked"
                      : d.lastSeenAt
                        ? `Last seen ${formatDistanceToNow(parseISO(d.lastSeenAt), { addSuffix: true })}`
                        : "Never connected"}
                  </p>
                </div>
                {!d.revokedAt && (
                  <Button
                    variant="danger"
                    disabled={revoke.isPending}
                    onClick={() => {
                      if (confirmId !== d.id) return setConfirmId(d.id);
                      revoke.mutate(d.id);
                      setConfirmId(null);
                    }}
                  >
                    {confirmId === d.id ? "Confirm revoke" : "Revoke"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
