"use client";

import { useEffect, useRef } from "react";

type StoredField = { name: string; value: string; checked?: boolean; type: string };

export function PersistentServerForm({ action, storageKey, clearOnMount, className, children }: {
  action: (formData: FormData) => void | Promise<void>;
  storageKey: string;
  clearOnMount?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (clearOnMount) {
      sessionStorage.removeItem(storageKey);
      return;
    }
    const saved = sessionStorage.getItem(storageKey);
    if (!saved || !formRef.current) return;
    try {
      const fields = JSON.parse(saved) as StoredField[];
      for (const field of fields) {
        const element = formRef.current.elements.namedItem(field.name);
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) continue;
        if (element instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) element.checked = Boolean(field.checked);
        else element.value = field.value;
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [clearOnMount, storageKey]);

  function preserve() {
    if (!formRef.current) return;
    const fields = Array.from(formRef.current.elements).flatMap((element): StoredField[] => {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) || !element.name || element.type === "hidden" || element.type === "submit") return [];
      return [{ name: element.name, value: element.value, type: element.type, checked: element instanceof HTMLInputElement ? element.checked : undefined }];
    });
    sessionStorage.setItem(storageKey, JSON.stringify(fields));
  }

  return <form ref={formRef} action={action} onInput={preserve} onChange={preserve} className={className}>{children}</form>;
}
