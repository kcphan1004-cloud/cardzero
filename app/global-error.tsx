"use client";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          background: "#070707",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <h1>网站暂时出现错误</h1>

            <p style={{ color: "#a1a1aa" }}>
              请稍后重新尝试。
            </p>

            <button
              type="button"
              onClick={() => unstable_retry?.()}
              style={{
                marginTop: "16px",
                padding: "10px 18px",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                background: "#dc2626",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              重新尝试
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}