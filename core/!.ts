#!/usr/bin/env node

declare const TAURI: boolean;
declare const NODE: boolean;

if (typeof NODE === "undefined")
	Object.assign(globalThis, { NODE: typeof process === "object" });

if (typeof TAURI === "undefined")
	Object.assign(globalThis, { TAURI: typeof window !== "undefined" && typeof (window as any).__TAURI__ !== "undefined" });
