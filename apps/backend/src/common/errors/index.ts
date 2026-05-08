export class SensitiveContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SensitiveContentError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}
