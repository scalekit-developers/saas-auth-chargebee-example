type ChargebeeApiError = {
  message?: string;
  api_error_code?: string;
  error_code?: string;
  http_status_code?: number;
};

export function isChargebeeApiError(error: unknown): error is ChargebeeApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('api_error_code' in error || 'error_code' in error || 'message' in error)
  );
}

export function getChargebeeErrorCode(error: unknown): string | undefined {
  if (!isChargebeeApiError(error)) return undefined;
  return error.error_code ?? error.api_error_code;
}

export function formatChargebeeUserMessage(error: unknown): string {
  const code = getChargebeeErrorCode(error);
  const message = isChargebeeApiError(error)
    ? error.message ?? error.error_code
    : error instanceof Error
      ? error.message
      : 'Chargebee request failed';

  if (code === 'no_applicable_gateway') {
    return (
      'Chargebee could not select a payment gateway for hosted checkout. ' +
      'Set CHARGEBEE_GATEWAY_ACCOUNT_ID in .env to your test gateway id (gw_...) from Settings → Payment Gateways.'
    );
  }

  return message ?? 'Chargebee request failed';
}

export function chargebeeErrorStatus(error: unknown): number {
  if (isChargebeeApiError(error) && error.http_status_code) {
    return error.http_status_code >= 400 && error.http_status_code < 600
      ? error.http_status_code
      : 400;
  }
  return 400;
}