"use client";

import * as React from "react";

/**
 * Sets `document.title` for client components (which can't use the
 * `metadata` API). Keeps the "%s · SignalScope AI" suffix consistent
 * with the root layout title template. Restores the previous title
 * on unmount.
 */
export function usePageTitle(title: string) {
  React.useEffect(() => {
    const prev = document.title;
    document.title = `${title} · SignalScope AI`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
