import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

export function unauthorizedResponse(message: string = "Unauthorized") {
  return errorResponse(message, 401);
}

export function notFoundResponse(message: string = "Not found") {
  return errorResponse(message, 404);
}

export function serverErrorResponse(
  message: string = "Internal server error"
) {
  return errorResponse(message, 500);
}

export function validationErrorResponse(errors: unknown) {
  return errorResponse("Validation failed", 400, errors);
}
