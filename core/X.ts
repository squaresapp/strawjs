
namespace Straw
{
	// Setup the default CSS property list in RawJS.
	for (const name of Straw.cssProperties)
		if (!Raw.properties.has(name))
			Raw.properties.add(name);
	
	// Defining this causes the types for Fila to become visible,
	// even though its not exported.
	type F = typeof import("fila-core");
	const g = globalThis as any;
	g.Fila = require("fila-core").Fila;
	require("fila-node").FilaNode.use();
}

module.exports = Straw;
/** export */