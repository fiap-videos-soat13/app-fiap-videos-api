export class ValidationException extends Error {
  public readonly errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  public readonly context: string;

  constructor(
    message: string,
    errors?: Array<{ field: string; message: string; code: string }>,
    context?: string,
  ) {
    super(message);
    this.name = "ValidationException";
    this.errors = errors ?? [];
    this.context = context ?? "";
  }
}

export class BusinessRuleException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleException";
  }
}

export class EntityNotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntityNotFoundException";
  }
}

export class ForbiddenException extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenException";
  }
}

export class UnauthorizedException extends Error {
  constructor(message = "Não autorizado") {
    super(message);
    this.name = "UnauthorizedException";
  }
}

export class ConflictException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictException";
  }
}
