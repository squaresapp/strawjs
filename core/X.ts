
declare var t: Raw["text"];

namespace Straw
{
	// Defining this causes the types for Fila to become visible,
	// even though its not exported.
	type F = typeof import("fila-core");
	const g = globalThis as any;
	
	if (NODE)
	{
		g.Fila = require("fila-core").Fila;
		require("fila-node").FilaNode.use();
		
		const linkedom = require("linkedom");
		Object.assign(globalThis, linkedom);
		
		// Create a baseline document. This document will get re-used
		// for every page that is generated, though each page gets its
		// own <head> and <body> elements.
		const parsed = linkedom.parseHTML("<!DOCTYPE html><html><head></head><body></body></html>");
		const { window, document } = parsed;
		g.window = window;
		g.document = document;
		
		const { raw, Raw } = require("@squaresapp/rawjs") as typeof import("@squaresapp/rawjs")
		g.Raw = Raw;
		g.raw = raw;
		g.t = raw.text.bind(raw);
		
		// Setup the default CSS property list in RawJS.
		for (const name of Straw.cssProperties)
			if (!Raw.properties.has(name))
				Raw.properties.add(name);
		
		// Monkey-patch the CSSOM dependency (fixes a bug in this library that affects RawJS)
		const proto = document.createElement("style").sheet!.constructor.prototype;
		const insertRule = proto.insertRule;
		proto.insertRule = function(this: any, rule: any, index = this.cssRules.length)
		{
			return insertRule.call(this, rule, index);
		};
	}
	
	// Straw needs to be a global.
	g.Straw = Straw;
}
