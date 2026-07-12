"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function ImageWithFallback({ src, fallbackSrc, onError, alt, ...props }: Omit<ImageProps, "src"> & { src: string; fallbackSrc: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = failedSrc === src ? fallbackSrc : src;

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={(event) => {
        if (resolvedSrc !== fallbackSrc) setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}
