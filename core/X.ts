
declare var t: Raw["text"];

namespace Straw
{
	/**
	 * @internal
	 */
	export declare const ts: typeof import("typescript");
	
	/**
	 * @internal
	 */
	export declare const photon: typeof import("@silvia-odwyer/photon-node");
	
	/**
	 * @internal
	 */
	export declare const Fila: typeof import("@squaresapp/fila");
	
	/**
	 * @internal
	 * Runs the initialization of StrawJS in the browser.
	 */
	export async function setup()
	{
		Straw.setup = () => Promise.resolve();
		
		if (NODE)
			return;
		
		const promises = [
			getScript("./photon.js", "photon"),
			getScript("./typescript.js", "ts"),
			getScript("./fila.js", "Fila"),
			getScript("./raw.min.js", "raw")
		];
		
		if (WEB)
			promises.push(getScript("./keyva.min.js", "Keyva"));
		
		const deps = await Promise.all(promises);
		const st = Straw as any;
		st.photon = deps[0];
		st.ts = deps[1];
		st.Fila = deps[2];
		
		// This has to be called in order to get our
		// hacked version of photon working in the browser.
		await st.photon.init();
	}
	
	/**
	 * Imports JavaScript code by temporarily including a <script>
	 * tag in the browser, and returning it's top-level export.
	 */
	function getScript(src: string, exportName: string)
	{
		return new Promise<any>(r =>
		{
			if (currentScript)
			{
				const base = currentScript.src;
				src = base.split("?")[0].split("/").slice(0, -1).join("/") + "/" + src;
			}
			
			const script = document.createElement("script");
			script.src = src;
			script.onload = () =>
			{
				const exp = (new Function("return " + exportName))();
				script.remove();
				r(exp);
			};
			document.head.append(script);
		});
	}
	
	let currentScript: HTMLScriptElement | null = null;
	
	if (NODE)
	{
		const g = globalThis as any;
		
		const linkedom = require("linkedom");
		Object.assign(g, linkedom);
		
		// Create a baseline document. This document will get re-used
		// for every page that is generated, though each page gets its
		// own <head> and <body> elements.
		const html = "<!DOCTYPE html><html><head></head><body></body></html>";
		const parsed = linkedom.parseHTML(html);
		const { window, document } = parsed;
		g.window = window;
		g.document = document;
		
		const { raw, Raw } = require("@squaresapp/rawjs") as typeof import("@squaresapp/rawjs");
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
		
		{
			const s = Straw as any;
			s.photon = require("@silvia-odwyer/photon-node");
			s.ts = require("./typescript.js");
			s.Fila = require("@squaresapp/fila").Fila;
		}
		
		// Auto-emit if StrawJS was being run directly from the command line
		// (as opposed to be used by the 
		if (require.main === module)
			setTimeout(() => Straw.emit(process.cwd()));
	}
	else
	{
		currentScript = document.currentScript as HTMLScriptElement;
		Straw.emit("/");
	}
}
