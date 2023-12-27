
namespace Straw
{
	Object.assign(globalThis, require("happy-dom"));
	
	// Defining this causes the types for Fila to become visible,
	// even though its not exported.
	type F = typeof import("fila-core");
	const g = globalThis as any;
	g.Fila = require("fila-core").Fila;
	require("fila-node").FilaNode.use();
}
