"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

const storageKey = "aiportal:analytics-consent:v1";
type Choice = "granted" | "denied" | "unset";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function setGoogleConsent(analyticsStorage: "granted" | "denied", mode: "default" | "update") {
  const target = window as GtagWindow;
  target.dataLayer ||= [];
  target.gtag ||= (...args: unknown[]) => { target.dataLayer?.push(args); };
  target.gtag("consent", mode, {
    analytics_storage: analyticsStorage,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function AnalyticsConsent({ gaId }: { gaId: string }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loadTag, setLoadTag] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let saved: Choice = "unset";
    try {
      const value = window.localStorage.getItem(storageKey);
      if (value === "granted" || value === "denied") saved = value;
    } catch {
      // Private browsing may disable local storage; ask again on the next visit.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      if (saved === "granted") {
        setGoogleConsent("granted", "default");
        setLoadTag(true);
      }
      setChoice(saved);
    });
    return () => { cancelled = true; };
  }, []);

  function select(next: "granted" | "denied") {
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // The choice still applies to this page when storage is unavailable.
    }
    setChoice(next);
    setShowSettings(false);
    if (next === "granted") {
      setGoogleConsent("granted", loadTag ? "update" : "default");
      setLoadTag(true);
    } else if (loadTag) {
      setGoogleConsent("denied", "update");
      window.location.reload();
    }
  }

  return (
    <>
      {loadTag && choice === "granted" && <GoogleAnalytics gaId={gaId} />}
      {choice !== null && (choice === "unset" || showSettings ? (
        <section aria-label="アクセス解析の設定" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-4 shadow-xl sm:inset-x-6 sm:p-5">
          <h2 className="text-sm font-bold text-gray-900">アクセス解析のCookieについて</h2>
          <p className="mt-2 text-xs leading-6 text-gray-700">
            サイト改善のため、同意いただいた場合にのみGoogle Analyticsを読み込みます。
            <a href="/privacy" className="ml-1 text-blue-700 underline">詳しくはプライバシーポリシー</a>をご覧ください。
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => select("denied")} className="rounded border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">拒否する</button>
            <button type="button" onClick={() => select("granted")} className="rounded bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800">同意する</button>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setShowSettings(true)} className="fixed bottom-3 left-3 z-[100] rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-gray-700">アクセス解析の設定</button>
      ))}
    </>
  );
}
