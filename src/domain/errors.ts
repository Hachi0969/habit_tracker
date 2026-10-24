/** Thrown when a value breaks a business rule (BR1-BR7). `field` names the input that is wrong. */
export class DomainError extends Error {
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "DomainError";
    this.field = field;
  }
}
