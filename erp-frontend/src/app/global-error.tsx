"use client";

// آخرین لایه: اگر خود layout اصلی خطا بدهد. باید html/body خودش را داشته باشد و به هیچ provider وابسته نباشد.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Tahoma, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>برنامه با خطا مواجه شد</h1>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "#475569" }}>
            صفحه را تازه کنید. اگر مشکل ادامه داشت، کد پیگیری را به پشتیبانی اعلام کنید.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#64748b" }} dir="ltr">
              کد پیگیری: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            تلاش دوباره
          </button>
        </div>
      </body>
    </html>
  );
}
