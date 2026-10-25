import axios from "axios";

/** کدهای ثابت قرارداد خطای بک‌اند (ERPDotNet.API/ErrorHandling/ApiProblem.cs) */
export type ApiErrorCode =
  | "validation"
  | "business_rule"
  | "not_found"
  | "conflict"
  | "unauthorized"
  | "forbidden"
  | "bad_request"
  | "server_error"
  | "network"
  | "timeout"
  | "cancelled"
  | "unknown";

/** شکل پاسخ خطای API (ProblemDetails با فیلدهای اضافه) */
export interface ApiProblem {
  status?: number;
  title?: string;
  detail?: string;
  code?: ApiErrorCode;
  message?: string;
  messages?: string[];
  errors?: Record<string, string[]>;
  traceId?: string;
  permission?: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "درخواست ارسالی معتبر نیست.",
  401: "نشست شما به پایان رسیده است. لطفاً دوباره وارد شوید.",
  403: "شما دسترسی لازم برای این عملیات را ندارید.",
  404: "اطلاعات مورد نظر یافت نشد.",
  409: "این اطلاعات همزمان تغییر کرده است. صفحه را تازه کنید.",
  413: "حجم اطلاعات ارسالی بیش از حد مجاز است.",
  422: "این عملیات با قوانین سیستم مغایرت دارد.",
  429: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
  500: "خطای غیرمنتظره‌ای در سرور رخ داد.",
  502: "سرور در دسترس نیست. کمی بعد دوباره تلاش کنید.",
  503: "سرور موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.",
  504: "پاسخ سرور بیش از حد طول کشید. دوباره تلاش کنید.",
};

const STATUS_CODES: Record<number, ApiErrorCode> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "business_rule",
};

const hasPersian = (text: string) => /[؀-ۿ]/.test(text);

/**
 * خطای یکسان همه درخواست‌های API.
 * هر جا خطا گرفته می‌شود همین نوع است؛ پیام همیشه فارسی و قابل نمایش به کاربر است.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly title: string;
  /** همه پیام‌ها برای نمایش (حداقل یک پیام) */
  readonly messages: string[];
  /** خطای هر فیلد با کلید هم‌شکل نام فیلد JSON، مثل `details[0].mainUnitQuantity` */
  readonly fieldErrors: Record<string, string[]>;
  /** شناسه پیگیری برای پشتیبانی؛ همان رکورد در لاگ سرور */
  readonly traceId?: string;
  readonly permission?: string;

  constructor(init: {
    status: number;
    code: ApiErrorCode;
    message: string;
    title?: string;
    messages?: string[];
    fieldErrors?: Record<string, string[]>;
    traceId?: string;
    permission?: string;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.title = init.title ?? "خطا";
    this.messages = init.messages?.length ? init.messages : [init.message];
    this.fieldErrors = init.fieldErrors ?? {};
    this.traceId = init.traceId;
    this.permission = init.permission;
  }

  get isValidation() {
    return this.code === "validation";
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0;
  }

  /** خطاهایی که کاربر نمی‌تواند خودش رفعشان کند و باید کد پیگیری داشته باشند */
  get isUnexpected() {
    return this.status >= 500 || this.code === "unknown";
  }
}

/** هر خطایی (axios، شبکه، کد) را به ApiError با پیام فارسی تبدیل می‌کند */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError({ status: 0, code: "cancelled", message: "درخواست لغو شد." });
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError({
        status: 0,
        code: "timeout",
        message: "پاسخ سرور بیش از حد طول کشید. اتصال را بررسی و دوباره تلاش کنید.",
      });
    }

    const response = error.response;
    if (!response) {
      return new ApiError({
        status: 0,
        code: "network",
        message: "ارتباط با سرور برقرار نشد. اتصال اینترنت یا روشن بودن سرور را بررسی کنید.",
      });
    }

    const status = response.status;
    const data = response.data as ApiProblem | string | undefined;
    const problem: ApiProblem = typeof data === "object" && data !== null ? data : {};
    const traceId = problem.traceId ?? response.headers?.["x-trace-id"];

    // پیام فارسی سرور در اولویت است؛ متن انگلیسی یا فنی هرگز به کاربر نمایش داده نمی‌شود
    const serverMessage =
      problem.detail ?? problem.message ?? (typeof data === "string" ? data : undefined);
    const message =
      serverMessage && hasPersian(serverMessage)
        ? serverMessage
        : (STATUS_MESSAGES[status] ??
          (status >= 500 ? STATUS_MESSAGES[500] : "درخواست با خطا مواجه شد."));

    return new ApiError({
      status,
      code: problem.code ?? STATUS_CODES[status] ?? (status >= 500 ? "server_error" : "unknown"),
      title: problem.title && hasPersian(problem.title) ? problem.title : undefined,
      message,
      messages: problem.messages?.filter(hasPersian),
      fieldErrors: problem.errors,
      traceId,
      permission: problem.permission,
    });
  }

  if (error instanceof Error) {
    console.error(error);
  }
  return new ApiError({
    status: 0,
    code: "unknown",
    message: "خطای غیرمنتظره‌ای رخ داد. صفحه را تازه کنید و دوباره تلاش کنید.",
  });
}
