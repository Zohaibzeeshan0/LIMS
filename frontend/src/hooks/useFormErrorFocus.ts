'use client';

import { useCallback } from 'react';
import { FieldErrors } from 'react-hook-form';

/**
 * Smoothly scrolls to and focuses the first invalid form field in DOM order.
 * 
 * @param errors - react-hook-form FieldErrors object
 * @param containerSelector - Optional selector for the modal or scrollable container
 */
export function scrollToFirstError<T extends Record<string, any>>(
  errors: FieldErrors<T>,
  containerSelector?: string
) {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return;

  const root = containerSelector ? document.querySelector(containerSelector) || document : document;

  let firstEl: HTMLElement | null = null;

  for (const key of errorKeys) {
    const el = root.querySelector(
      `[name="${key}"], [data-field-name="${key}"], #${key}, [id="${key}"]`
    ) as HTMLElement | null;

    if (el) {
      if (!firstEl) {
        firstEl = el;
      } else {
        // Compare document position to guarantee the topmost visible element in DOM order
        if (el.compareDocumentPosition(firstEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
          firstEl = el;
        }
      }
    }
  }

  if (firstEl) {
    // 1. Smoothly scroll into viewport
    firstEl.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    // 2. Set active cursor focus
    setTimeout(() => {
      if (firstEl) {
        firstEl.focus({ preventScroll: true });

        // If wrapper element was matched instead of the direct input
        if (document.activeElement !== firstEl) {
          const focusable = firstEl.querySelector<HTMLElement>(
            'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable) {
            focusable.focus({ preventScroll: true });
          }
        }
      }
    }, 120);
  }
}

/**
 * Custom React hook for handling form error auto-focus and toast alerts
 */
export function useFormErrorFocus() {
  const handleErrors = useCallback(
    <T extends Record<string, any>>(
      errors: FieldErrors<T>,
      containerSelector?: string,
      onErrorToast?: (message: string) => void
    ) => {
      scrollToFirstError(errors, containerSelector);
      if (onErrorToast) {
        onErrorToast('Incomplete Form: Please fill in all required fields before confirming.');
      }
    },
    []
  );

  return { scrollToFirstError, handleErrors };
}

export default useFormErrorFocus;
