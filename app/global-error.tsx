"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & {
    digest?: string;
  };
  unstable_retry: () => void;
};

export default function GlobalError({
  error,
  unstable_retry,
}: GlobalErrorProps) {
  useEffect(() => {
    console.error(
      "CardZero global error:",
      error,
    );
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          background: "#000000",
          color: "#ffffff",
          fontFamily:
            "Arial, Helvetica, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              border: "1px solid #3f3f46",
              borderRadius: "24px",
              background: "#09090b",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ef4444",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.2em",
              }}
            >
              CARDZERO
            </p>

            <h1
              style={{
                marginTop: "16px",
                marginBottom: 0,
                fontSize: "28px",
              }}
            >
              页面暂时无法显示
            </h1>

            <p
              style={{
                marginTop: "14px",
                color: "#a1a1aa",
                lineHeight: 1.8,
              }}
            >
              系统发生暂时性错误，请重新尝试。
            </p>

            <button
              type="button"
              onClick={unstable_retry}
              style={{
                marginTop: "24px",
                border: 0,
                borderRadius: "12px",
                background: "#b91c1c",
                color: "#ffffff",
                padding: "12px 20px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              重新载入
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}