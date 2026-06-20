export type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
};

