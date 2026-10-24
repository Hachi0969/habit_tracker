import type { ZodError } from "zod";
import { DomainError } from "../domain/index.ts";

/** Field name -> message, so the form can mark the right field (UC2 alternate flow 6a). */
export class ValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors)[0] ?? "Invalid input");
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }

  static fromZod(error: ZodError): ValidationError {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      fields[key] ??= issue.message;
    }
    return new ValidationError(fields);
  }

  static fromDomain(error: DomainError): ValidationError {
    return new ValidationError({ [error.field ?? "form"]: error.message });
  }
}

/** Short reason for an import report line. */
export function describeError(error: unknown): string {
  if (error instanceof ValidationError) {
    return Object.entries(error.fieldErrors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}
