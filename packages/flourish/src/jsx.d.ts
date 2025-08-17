// src/jsx.d.ts
import 'solid-js'; // ensure base JSX types are loaded

declare global {
  namespace JSX {
    interface Directives {
      // keep in sync with your exported type
      postMoveFlash: import('./trigger-post-move-flash').PostMoveFlashDirectiveValue;
    }
  }
}

export {}; // make this file a module (safe for TS / bundlers)
