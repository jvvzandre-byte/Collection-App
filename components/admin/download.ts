"use client";

/** Hand the admin a file to save. Browser-only; no storage involved. */
export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  // CSV gets a byte-order mark so Excel reads it as UTF-8.
  const parts = type.startsWith("text/csv") ? ["﻿", content] : [content];
  const url = URL.createObjectURL(new Blob(parts, { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
