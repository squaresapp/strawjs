
declare var t: Raw["text"];

namespace Straw
{
	Object.assign(globalThis, require("happy-dom"));
	
	// Defining this causes the types for Fila to become visible,
	// even though its not exported.
	type F = typeof import("fila-core");
	const g = globalThis as any;
	g.Fila = require("fila-core").Fila;
	require("fila-node").FilaNode.use();
	
	const arg = { url: "https://localhost:8080" };
	//@ts-ignore
	g.window = new Window(arg);
	g.document = window.document;
	
	const { raw, Raw } = require("@squaresapp/rawjs") as typeof import("@squaresapp/rawjs")
	g.Raw = Raw;
	g.raw = raw;
	g.t = raw.text.bind(raw);
	
	// Setup the default CSS property list in RawJS.
	for (const name of Straw.cssProperties)
		if (!Raw.properties.has(name))
			Raw.properties.add(name);
	
	// Straw needs to be a global.
	g.Straw = Straw;
}
