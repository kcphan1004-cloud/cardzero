"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    kofiwidget2?: {
      init: (
        text: string,
        color: string,
        id: string,
      ) => void;
      draw: () => void;
    };
  }
}

const KOFI_URL = "https://ko-fi.com/Z6Q4202DKA";

export default function BehDeckKofiButton() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    function renderOfficialWidget() {
      const container = containerRef.current;

      if (
        cancelled ||
        !container ||
        !window.kofiwidget2
      ) {
        return;
      }

      let generatedHtml = "";
      const originalWrite = document.write.bind(
        document,
      );
      const originalWriteln =
        document.writeln.bind(document);

      try {
        document.write = (...parts: string[]) => {
          generatedHtml += parts.join("");
        };

        document.writeln = (
          ...parts: string[]
        ) => {
          generatedHtml += `${parts.join("")}\n`;
        };

        window.kofiwidget2.init(
          "Support Ba Jiao Yu on Ko-fi",
          "#4297ff",
          "Z6Q4202DKA",
        );
        window.kofiwidget2.draw();
      } catch (error) {
        console.error(
          "Ko-fi 按钮载入失败：",
          error,
        );
      } finally {
        document.write = originalWrite;
        document.writeln = originalWriteln;
      }

      if (generatedHtml.trim()) {
        container.innerHTML = generatedHtml;

        const anchor =
          container.querySelector("a");

        if (anchor) {
          anchor.setAttribute(
            "target",
            "_blank",
          );
          anchor.setAttribute(
            "rel",
            "noreferrer noopener",
          );
        }
      }
    }

    if (window.kofiwidget2) {
      renderOfficialWidget();
      return () => {
        cancelled = true;
      };
    }

    const existingScript =
      document.querySelector<HTMLScriptElement>(
        'script[data-cardzero-kofi="true"]',
      );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        renderOfficialWidget,
        { once: true },
      );

      return () => {
        cancelled = true;
        existingScript.removeEventListener(
          "load",
          renderOfficialWidget,
        );
      };
    }

    const script =
      document.createElement("script");

    script.src =
      "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
    script.async = true;
    script.dataset.cardzeroKofi = "true";
    script.addEventListener(
      "load",
      renderOfficialWidget,
      { once: true },
    );
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener(
        "load",
        renderOfficialWidget,
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="[&_a]:inline-flex [&_a]:min-h-12 [&_a]:w-full [&_a]:items-center [&_a]:justify-center [&_a]:rounded-xl [&_a]:font-bold"
    >
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4297ff] px-5 text-sm font-black text-white transition hover:brightness-110"
      >
        <span aria-hidden="true">☕</span>
        Support Ba Jiao Yu on Ko-fi
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
