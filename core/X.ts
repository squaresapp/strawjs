
declare const straw: Straw.Site;

namespace Straw
{
	const g = globalThis as any;
	Object.assign(globalThis, require("happy-dom"));
	
	// Defining this causes the types for Fila to become visible,
	// even though its not exported.
	type F = typeof import("fila-core");
	
	const { Raw } = require("@squaresapp/rawjs") as typeof import("@squaresapp/rawjs");
	
	for (const name of Straw.cssProperties)
		if (!Raw.properties.has(name))
			Raw.properties.add(name);
	
	//@ts-ignore
	g.window = new Window({
		url: "https://localhost:8080",
		width: 1024,
		height: 768,
	});
	g.document = g.window.document;
	g.Raw = Raw;
	g.raw = new Raw(g.document);
	g.straw = new Straw.Site();
	
	g.Fila = require("fila-core").Fila;
	(require("fila-node") as typeof import("fila-node")).FilaNode.use();
}

const t = raw.text.bind(raw);
