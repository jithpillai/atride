"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <button type="button" onClick={logout} disabled={loading} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-zinc-200 hover:border-orange-400/50 hover:text-white disabled:opacity-50">
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
