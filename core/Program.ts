
namespace Straw
{
	/**
	 * 
	 */
	export class Program
	{
		/**
		 * 
		 */
		constructor(directory = "")
		{
			if (NODE)
			{
				Straw.setup();
				this.directories = new Directories(directory ||= process.cwd());
				
				// Auto-emit if StrawJS was being run directly from the command line
				// (as opposed to being consumed by a library.)
				if (require.main === module)
					this.compile();
			}
			else
			{
				this.directories = new Directories(directory);
			}
			
			this.define("icon", (properties, params) =>
			{
				if (!properties.src)
					return;
				
				if (properties.src.includes("?"))
					throw new Error("Icon files cannot contain image processing parameters.");
				
				return Util.createElement("icon", properties, params);
			});
			
			this.define("feed", (properties, params) =>
			{
				return Util.createElement("feed", properties, params);
			});
		}
		
		/** */
		readonly directories;
		
		/**
		 * Define a custom JSX element.
		 */
		define<K extends keyof JSX.IntrinsicElements>(
			tag: K,
			fn: JsxRenderFunction<K>,
			designerData: Partial<JsxElementDesignerData> = {})
		{
			const data: JsxElementDesignerData = {
				description: designerData.description || "",
				has: designerData.has || [],
				markup: designerData.markup || false,
			};
			
			this._defines.set(tag, {
				renderFn: fn,
				...data,
			});
		}
		
		/**
		 * Gets a readonly map of the custom JSX elements that
		 * have been defined in the current theme.
		 */
		get defines(): ReadonlyMap<string, JsxElementDefinition>
		{
			return this._defines;
		}
		private _defines = new Map<string, JsxElementDefinition>();
		
		/**
		 * Gets a table of type information about each of the JSX elements
		 * that have been defined.
		 */
		async getDefinedJsxElementTypeInfo()
		{
			if (!this.jsxElementInspector)
				this.jsxElementInspector = await JsxElementInspector.new(this.directories.support);
			
			const defs = Array.from(this.defines.keys());
			const typeInfos = this.jsxElementInspector.inspect(...defs);
			return typeInfos;
		}
		private jsxElementInspector: JsxElementInspector | null = null;
		
		/** */
		jsx(
			tag: keyof JSX.IntrinsicElements,
			properties: Record<string, any> | null, ...params: Raw.Param[])
		{
			const def = this.defines.get(tag);
			if (def)
			{
				// Generated class names should be appended
				// as class names rather than text content.
				const reg = new RegExp("^" + Raw.GeneratedClassPrefix.value + "[a-z\\d]{9,11}$");
				
				params = params
					.filter(p => p)
					.map(p => typeof p === "string" && !reg.test(p) ? raw.text(p) : p);
				
				return def.renderFn(properties || {}, params);
			}
			
			return raw.jsx(tag, properties, ...params);
		}
		
		/**
		 * Emits the output of the contents of this Program to the directory
		 * as specified in the .directory property.
		 */
		async compile()
		{
			// Wait until the next turn of the event loop before running
			// the emit process. This defends against the case when the
			// call to straw.compile() isn't at the bottom of the file, which
			// provides an opportunity for the other parts of the user
			// code to define pages.
			await new Promise(r => setTimeout(r));
			await Straw.setup();
			await this.evaluateSupportCode();
			await this.scanTsxFiles();
			const pages = Array.from(this.pages.values());
			await Promise.all(pages.map(page => page.compile()));
			
			await Promise.all([
				//# Create the /static folder within the site if necessary
				new Promise<void>(async r =>
				{
					if (await this.directories.fila.static.exists())
					{
						const destStaticFolder = this.directories.fila.site.down(ProjectFolder.static);
						
						// The Cloudflare build-bot doesn't support symlinks, so the files
						// need to be copied instead of symlinked. This doesn't matter during
						// build because everything is discarded after a successful build.
						inCloudflareBuildBot ?
							await this.directories.fila.static.move(destStaticFolder) :
							await destStaticFolder.writeSymlink(this.directories.fila.static);
					}
					
					r();
				}),
				//# Copy over the files that start with a caret ^
				new Promise<void>(async r =>
				{
					const sourceFilas = await Util.findFiles(
						this.directories.fila.source,
						f => f.name.startsWith(Straw.copyPrefix));
					
					await Promise.all(
						sourceFilas.map(srcFila => new Promise<void>(async r =>
						{
							const len = this.directories.fila.source.components.length;
							const comp = srcFila.components.slice(len);
							comp[comp.length - 1] = srcFila.name.slice(Straw.copyPrefix.length);
							const targetFila = this.directories.fila.site.down(...comp);
							await srcFila.copy(targetFila);
							r();
						}))
					);
					
					r();
				})
			]);
		}
		
		//# TSX File Management
		
		/**
		 * Launches a file watcher that detects changes to relevant code
		 * files in the source directory, and recompiles them.
		 */
		startFileWatcher()
		{
			this.unwatchFn = this.directories.fila.source.watch("recursive", (ev, fila) =>
			{
				if (fila.name === Straw.indexFileName)
				{
					if (ev == Fila.Event.create || ev === Fila.Event.modify)
						this.createPage(fila.path);
					
					else if (ev === Fila.Event.delete)
					{
						// This doesn't work.
						debugger;
						this._pages.delete(fila.path);
					}
				}
			});
		}
		
		/**
		 * 
		 */
		stopFileWatcher()
		{
			this.unwatchFn();
		}
		
		private unwatchFn = () => {};
		
		/**
		 * 
		 */
		get isFileWatcherRunning()
		{
			return this._isFileWatcherRunning;
		}
		private _isFileWatcherRunning = false;
		
		/**
		 * Scans the Program directory for files named index.tsx,
		 * and adds them to the program.
		 */
		private async scanTsxFiles()
		{
			const indexTsxFilas = await Util.findFiles(
				this.directories.fila.source,
				f => f.name.toLowerCase() === Straw.indexFileName);
			
			const promises = indexTsxFilas.map(fila => this.createPage(fila.path));
			await Promise.all(promises);
		}
		
		/**
		 * Loads a new page into the Program from the specified path.
		 */
		async createPage(pageSourcePath: string)
		{
			const page = await Page.new(this, pageSourcePath);
			this._pages.set(page.sourcePath, page);
			return page;
		}
		
		/**
		 * Gets a map of the index.tsx files located within the /source directory.
		 * The map is indexed by the relative path within the source directory.
		 */
		get pages(): ReadonlyMap<string, Page>
		{
			return this._pages;
		}
		private readonly _pages = new Map<string, Page>();
		
		//# Evaluation
		
		/**
		 * Finds any JavaScript support code ("theme code"), executes it, and stores any
		 * exported values found in the module.exports. The code is instrumented to use
		 * "auto-exports", which is where all top level identifiers are automatically added
		 * to the module.exports object.
		 */
		private async evaluateSupportCode(clearCache = false)
		{
			if (clearCache)
				this.exportsTable.clear();
			
			const contents = await this.directories.fila.support.readDirectory();
			for (const fila of contents)
			{
				if (fila.extension !== ".js" || this.exportsTable.has(fila.path))
					continue;
				
				// Don't evaluate anything that has already been included
				// in the Node.JS environment as a module.
				if (NODE)
					if ([require.main?.filename || "", ...Object.keys(require.cache)].includes(fila.path))
						continue;
				
				let jsCode = await fila.readText();
				
				jsCode += Array.from(jsCode.match(autoExportReg) || [])
					.map(s => s.trim().split(/\s+/)[1])
					.map(name => `\ntypeof ${name} !== "undefined" && (module.exports.${name} = ${name});`)
					.join("");
				
				const result = this.evaluate(jsCode);
				if (result instanceof Error)
				{
					console.log(result.message);
					continue;
				}
				
				this.exportsTable.set(fila.path, result.exports);
			}
		}
		
		/**
		 * Stores the table of exports where the keys are the path to the JavaScript file
		 * and the values are the exported from a support theme file.
		 */
		private readonly exportsTable = new Map<string, Record<string, any>>();
		
		/**
		 * Evaluates the specified JavaScript code in a new function with the specified
		 * inputs map, where the keys of the map are the parameter names, and the 
		 * values are the argument values passed in the respective parameters.
		 */
		evaluate(jsCode: string, inputs: Record<string, any> = {})
		{
			try
			{
				const allParams = new Map<string, any>(Object.entries(inputs));
				
				for (const [, exports] of this.exportsTable)
				{
					for (const [name, value] of Object.entries(exports))
					{
						const existing = allParams.get(name);
						if (existing && existing.constructor === Object)
							Object.assign(existing, value);
						else
							allParams.set(name, value);
					}
				}
				
				let exports = {};
				const module = { exports };
				const fn = new Function("straw", "module", "exports", ...allParams.keys(), jsCode);
				fn(this, module, exports, ...allParams.values());
				return module;
			}
			catch (cause: unknown)
			{
				if (cause instanceof Error)
					return cause;
				
				if (typeof cause === "string")
					return new Error(cause);
				
				return new Error("Theme code generated an error", { cause });
			}
		}
	}
	
	const autoExportReg = /\n(var|let|const|function|class)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
	
	/** */
	const inCloudflareBuildBot =
		typeof process === "object" &&
		typeof process.env === "object" &&
		process.env.CI === "true" &&
		!!process.env.CF_PAGES;
	
	/** @internal */
	export const jsxFactoryFunctionName = "___jsx___";
	
	/** @internal */
	export const jsxFactorySuffixChar = "x";
	
	/** @internal */
	export const jsxFactorySuffixLength = 5;
	
	/** @internal */
	export const jsxFactoryFunctionFullName = 
		jsxFactoryFunctionName + 
		jsxFactorySuffixChar.repeat(jsxFactorySuffixLength);
	
}
