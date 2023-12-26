
namespace Straw
{
	const g = globalThis as any;
	
	Object.assign(globalThis, require("happy-dom"));
	//@ts-ignore
	g.window = new Window({
		url: "https://localhost:8080",
		width: 1024,
		height: 768,
	});
	g.document = g.window.document;
	
	// Defining this causes the types for Fila to become visible,
	// even though its not exported.
	type F = typeof import("fila-core");
	g.Fila = require("fila-core").Fila;
	require("fila-node").FilaNode.use();
	
	const { Raw } = require("@squaresapp/rawjs") as typeof import("@squaresapp/rawjs");
	
	for (const name of Straw.cssProperties)
		if (!Raw.properties.has(name))
			Raw.properties.add(name);
	
	const straw = new Straw.Site();
	const raw = new Raw(g.document);
	const t = raw.text.bind(raw);
	
	Object.assign(module.exports, { straw, Straw, raw, Raw, t });
}

declare module "strawjs"
{
	const __export: {
		straw: Straw.Site,
		Straw: typeof Straw,
		raw: Raw,
		Raw: typeof Raw,
		t: Raw["text"],
	};
	
	export = __export;
}
