// Consistent API response format
export interface APIResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export function successResponse<T>(data: T, status: number = 200): APIResponse<T> {
  return {
    data,
    error: null,
    status,
  };
}

export function errorResponse(
  error: string,
  status: number = 400
): APIResponse<null> {
  return {
    data: null,
    error,
    status,
  };
}

export function sendJSON<T>(response: APIResponse<T>) {
  return Response.json(response, {
    status: response.status,
  });
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
