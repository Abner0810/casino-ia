// Error con código HTTP propio. Lanzado por services/middlewares y
// traducido a respuesta JSON por el error.handler.
export class ApiError extends Error {
  constructor(statusCode, message, details, code) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.headers = null;
    this.bodyExtra = null;
  }
}
