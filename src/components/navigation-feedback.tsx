"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PendingOverlay } from "@/components/pending-feedback";

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const navigationKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNavigating(false));
    return () => window.cancelAnimationFrame(frame);
  }, [navigationKey]);

  useEffect(() => {
    function beginNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin || destination.href === current.href) return;
      if (destination.pathname === current.pathname && destination.search === current.search && destination.hash) return;
      setNavigating(true);
    }
    function beginHistoryNavigation() { setNavigating(true); }
    document.addEventListener("click", beginNavigation, true);
    window.addEventListener("popstate", beginHistoryNavigation);
    return () => {
      document.removeEventListener("click", beginNavigation, true);
      window.removeEventListener("popstate", beginHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const timeout = window.setTimeout(() => setNavigating(false), 12000);
    return () => window.clearTimeout(timeout);
  }, [navigating]);

  return <PendingOverlay show={navigating} label="Opening page…" fixed />;
}
