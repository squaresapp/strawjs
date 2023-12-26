#!/usr/bin/env node

// Happy DOM is required.
Object.assign(globalThis, require("happy-dom"));

// Setup the default CSS property list in RawJS.
for (const name of Straw.cssProperties)
	if (!Raw.properties.has(name))
		Raw.properties.add(name);