
namespace Straw
{
	/**
	 * A class that represents a page in the site.
	 * These are created as a result of a file named "index.tsx" located
	 * somewhere in the site's /source directory.
	 */
	export class Page
	{
		/** @internal */
		static async new(program: Straw.Program, sourcePath: string)
		{
			const fila = new Fila(sourcePath);
			const page = new Page(program, sourcePath);
			page._dateCreated = await fila.getCreatedTicks();
			page._dateModified = await fila.getModifiedTicks();
			return page;
		}
		
		/** */
		private constructor(
			private readonly program: Straw.Program,
			sourcePath: string)
		{
			this.sourceFila = new Fila(sourcePath);
			
			this.sourcePath = this.sourceFila.path
				.slice(this.program.directories.source.length + 1);
			
			const comp = this.sourceFila.components.slice();
			const idx = comp.indexOf(ProjectFolder.source.replace("/", ""));
			comp[idx] = ProjectFolder.site;
			comp[comp.length - 1] = comp[comp.length - 1].replace(/\.tsx$/, ".html");
			this.outFila = new Fila(...comp);
		}
		
		/**
		 * Specifies the path to the source page (index.tsx) within the
		 * website's source folder. The value is relative to the project root.
		 * For example, /products/my-product/index.tsx
		 */
		readonly sourcePath: string;
		
		/** @internal */
		private readonly sourceFila: Fila;
		
		/** @internal */
		private readonly outFila: Fila;
		
		/**
		 * Specifies the Nodes to include in the page, which get
		 * organized into body and head elements during emit.
		 */
		get documentElement()
		{
			if (!this._documentElement)
				throw new Error("Page has not been compiled.");
			
			return this._documentElement;
		}
		private _documentElement: HTMLHtmlElement | null = null;
		
		/** */
		get head()
		{
			if (!this._head)
				throw new Error("Page has not been compiled.");
			
			return this._head;
		}
		private _head: HTMLHeadElement | null = null;
		
		/** */
		get body()
		{
			if (!this._body)
				throw new Error("Page has not been compiled.");
			
			return this._body;
		}
		private _body: HTMLBodyElement | null = null;
		
		/** */
		get dateCreated()
		{
			return this._dateCreated;
		}
		private _dateCreated = 0;
		
		/** */
		get dateModified()
		{
			return this._dateModified;
		}
		private _dateModified = 0;
		
		/**
		 * A function that translates a compiled JavaScript file location
		 * into a source TypeScript file location.
		 */
		private translateLocationFn: TLocationTranslatorFn = () => 0;
		
		/**
		 * Stores the function to call when a JSX <html> tag is encountered.
		 */
		private htmlCaptureCallback: ((htmlElement: Element) => void) = () => {};
		
		/**
		 * An object that stores the original 
		 */
		private readonly code = { ts: "", js: "" };
		
		/**
		 * @internal
		 * Stores the TypeScript SourceFile class, which is the root
		 * node of the file's AST.
		 */
		private typescriptRootNode: SourceFile | null = null;
		
		/** */
		async compile()
		{
			await Straw.setup();
			this.code.ts = await this.sourceFila.readText();
			const imageRewriter = new ImageRewriter(this.program.directories.fila.project);
			
			//# JavaScript compilation
			
			const jsxFactoryFn = this.createJsxFactoryFunction();
			
			this.code.js = Straw.ts.transpile(this.code.ts, {
				module: Straw.ts.ModuleKind.System,
				target: Straw.ts.ScriptTarget.ES2015,
				sourceMap: true,
				inlineSourceMap: true,
				inlineSources: true,
				jsx: Straw.ts.JsxEmit.React,
				jsxFactory: Straw.jsxFactoryFunctionFullName
			});
			
			this.translateLocationFn = Straw.createLocationTranslator(this.code.js);
			this.code.js = this.instrumentJsxCalls(this.code.js);
			
			this.typescriptRootNode = Straw.ts.createSourceFile(
				Straw.indexFileName,
				this.code.ts,
				Straw.ts.ScriptTarget.ES2022,
				undefined, 
				Straw.ts.ScriptKind.TSX);
			
			{
				let documentElement: Element | null = null;
				
				try
				{
					this.htmlCaptureCallback = e => documentElement = e;
					
					const error = this.program.evaluate(
						this.code.js,
						{ [jsxFactoryFunctionName]: jsxFactoryFn });
					
					if (error instanceof Error)
						throw error;
				}
				catch (e)
				{
					console.error("An error occured while trying to evaluate the file: " + this.sourceFila.path);
					console.log(e);
				}
				finally
				{
					this.htmlCaptureCallback = () => {};
				}
				
				this._documentElement = documentElement || raw.jsx("html", null) as HTMLHtmlElement;
			}
			
			//# Find or create the <head> and <body> elements, 
			{
				const children = Array.from(this.documentElement.children);
				
				let body = children.find(e => e.tagName === "BODY") as HTMLBodyElement;
				if (!body)
				{
					body = raw.body();
					this.documentElement.prepend(body);
				}
				this._body = body;
				
				let head = children.find(e => e.tagName === "HEAD") as HTMLHeadElement;
				if (!head)
				{
					head = raw.head();
					this.documentElement.prepend(head);
				}
				this._head = head;
				
				// Move top-level meta elements to the <head>
				for (const child of children)
					if (metadataTags.includes(child.tagName))
						head.append(child);
				
				// Hoist the meta elements defined in the body to the <head>
				const query = body.querySelectorAll(metadataTags.join(","));
				for (let i = -1;  ++i < query.length;)
					this.head.append(query[i]);
			}
			
			//# Optimize duplicate head section elements
			const headElements = Array.from(this.head.children);
			const definitions = new Set<string>();
			
			for (let i = headElements.length; i-- > 0;)
			{
				const e = headElements[i];
				const html = e.outerHTML;
				if (definitions.has(html))
					e.remove();
				else
					definitions.add(html);
			}
			
			//# Create any webfeed files
			for (const feedElement of Array.from(this.head.querySelectorAll("feed")))
			{
				feedElement.remove();
				const include = feedElement.getAttribute("include") || ".";
				const regex = convertGlobToRegEx(include);
				const feedIndexFile = this.outFila.up().down("index.txt");
				
				const index = Array.from(this.program.pages.values())
					.filter(page => regex.test(page.sourcePath))
					.sort((a, b) => b.dateCreated - a.dateCreated)
					.map(p => p.sourcePath)
					.join("\n");
				
				await feedIndexFile.writeText(index);
			}
			
			//# Generate any icons
			for (const iconElement of Array.from(this.head.querySelectorAll("icon")))
			{
				const src = iconElement.getAttribute("src");
				if (src)
				{
					const imageFila = await ImageProcessor.findImage(
						this.program.directories.fila.source,
						src);
					
					if (!imageFila)
						throw new Error("Image not found: " + imageFila);
					
					await ImageProcessor.processIcon(imageFila, this.program.directories.fila.site);
					const linkTags = Util.createIcon(src);
					iconElement.replaceWith(...linkTags);
				}
				else iconElement.remove();
			}
			
			//# Fix the image URLs
			await imageRewriter.adjust(this.head, this.body);
			
			const nodes = Array.from(this.head.children);
			
			if (this.body.attributes.length === 0)
				nodes.push(...Array.from(this.body.children));
			else
				nodes.push(this.body);
			
			const htmlContent = new HtmlElementEmitter({ nodes }).emit();
			await this.outFila.writeText(htmlContent);
		}
		
		/**
		 * This code replaces strings that look something like this:
		 * "___jsx___xxxx("
		 * with something that looks like this:
		 * "___jsx___(1   ,"
		 * 
		 * The number that is injected is the location in the original
		 * TypeScript source file where the JsxElement was defined.
		 */
		private instrumentJsxCalls(jsCode: string)
		{
			const reg = new RegExp(Straw.jsxFactoryFunctionFullName + "\\(", "g");
			
			const code = jsCode.replace(reg, (match: string, jsOffset: number) =>
			{
				const tsOffset = this.translateLocationFn(jsOffset);
				const len = jsxFactorySuffixLength;
				const paramText = (tsOffset + " ".repeat(len)).slice(0, len - 1) + `,`;
				return jsxFactoryFunctionName + "(" + paramText;
			});
			
			return code;
		}
		
		/**
		 * Gets a mapping table that allows TypeScript JsxElement AST nodes
		 * to be queried by their starting positions.
		 */
		private getJsxElementNodeMap()
		{
			if (this.jsxElementNodeMap === null)
			{
				const map = new Map<number, TsNode>();
				
				if (!this.typescriptRootNode)
					throw new Error("Cannot call this method because the page has not been compiled.");
				
				for (const node of Util.walkAbstractSyntaxTree(this.typescriptRootNode))
					if (node.kind === Straw.ts.SyntaxKind.JsxElement ||
						node.kind === Straw.ts.SyntaxKind.JsxSelfClosingElement)
						map.set(node.pos, node);
				
				this.jsxElementNodeMap = map;
			}
			
			return this.jsxElementNodeMap;
		}
		private jsxElementNodeMap: Map<number, TsNode> | null = null;
		
		/** */
		private createJsxFactoryFunction()
		{
			return (
				tsSourcePosition: number,
				tag: keyof JSX.IntrinsicElements,
				properties: Record<string, any>,
				...params: Raw.Param<Raw.ElementAttribute>[]) =>
			{
				const jsxResult = this.program.jsx(tag, properties, ...params);
				if (!jsxResult)
					return null;
				
				const map = this.getJsxElementNodeMap();
				const tsNode = map.get(tsSourcePosition);
				
				if (tsNode)
					for (const element of Util.asArray(jsxResult))
						elementTsNodeMap.set(element, tsNode);
				
				if (tag === "html" && !Array.isArray(jsxResult))
					this.htmlCaptureCallback?.(jsxResult);
				
				return jsxResult;
			}
		}
		
		/**
		 * 
		 */
		getStrawElementFromDomElement(domElement: Element): JsxElement | null
		{
			let tsNode: TsNode | undefined;
			
			for (let e = domElement; e; e = e.parentElement!)
				if (tsNode = elementTsNodeMap.get(domElement))
					break;
			
			if (!tsNode)
				return null;
			
			let jsxTagName = "";
			
			if (tsNode.kind === Straw.ts.SyntaxKind.JsxElement)
			{
				const jsxNode = tsNode as TsJsxElementNode;
				jsxTagName = Util.getTagName(jsxNode.openingElement);
			}
			else if (tsNode.kind === Straw.ts.SyntaxKind.JsxSelfClosingElement)
			{
				const jsxNode = tsNode as TsJsxSelfClosingElementNode;
				jsxTagName = Util.getTagName(jsxNode);
			}
			
			if (!jsxTagName)
				return null;
			
			const definition = this.program.defines.get(jsxTagName) || {
				description: jsxTagName,
				has: [],
				markup: [],
				renderFn: () => {}
			};
			
			return {
				definition,
				typescriptNode: tsNode,
			};
		}
		
		//# TSX Page Mutation methods
		
		/**
		 * 
		 */
		writeTsxAttribute(
			jsxElement: JsxElement,
			jsxAttributeName: string,
			jsxAttributeValue: { toString: () => string })
		{
			
		}
		
		/**
		 * 
		 */
		writeTsxContent(
			jsxElement: JsxElement,
			...args: unknown[]
		)
		{
			
		}
		
		/**
		 * 
		 */
		writeTsxElement(
			
			...args: unknown[]
		)
		{
			
		}
		
		/**
		 * Writes a new TSX file to the file system, optionally starting from a
		 * template TSX file.
		 */
		writeTsxFile(
			path: string,
			template?: unknown)
		{
			
		}
	}
	
	/**
	 * Stores a giant WeakMap whose keys are DOM Elements that are created via
	 * JSX function calls, and whose values are the TypeScript AST node that is
	 * was initially responsible for the creation of the DOM Element.
	 */
	const elementTsNodeMap = new WeakMap<Element, TsNode>();
	
	/** */
	const metadataTags = ["LINK", "META", "TITLE", "STYLE", "BASE", "ICON", "FEED"] as readonly string[];
}
