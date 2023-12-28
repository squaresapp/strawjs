
namespace Straw
{
	export type PageParam = Element | Element[] | string | string[];
	export type PageRenderFn = () => PageParam[];
	
	/** */
	export class Site
	{
		/** */
		constructor()
		{
			const { Raw } = require("@squaresapp/rawjs") as typeof import("@squaresapp/rawjs")
			this.rawType = Raw;
			
			// Setup the default CSS property list in RawJS.
			for (const name of Straw.cssProperties)
				if (!this.rawType.properties.has(name))
					this.rawType.properties.add(name);
		}
		
		private readonly rawType: typeof Raw;
		
		/**
		 * Initializes a straw website with the necessary packages installed
		 * and the default directories required.
		 */
		init(options: InitOptions)
		{
			return Straw.init(options);
		}
		
		/**
		 * 
		 */
		feed(options: IFeedOptions)
		{
			options = Object.assign({ index: "index.txt" }, options);
			this._feeds.set(options.root || ".", options);
		}
		
		private readonly _feeds = new Map<string, Straw.IFeedOptions>();
		
		/**
		 * Creates a standard HTML page at the specified location.
		 */
		page(relativePath: string, renderFn: PageRenderFn): Page;
		page(relativePath: string, date: Date, renderFn: PageRenderFn): Page;
		page(relativePath: string, a: any, renderFn?: PageRenderFn)
		{
			const fn: PageRenderFn = typeof a === "function" ? a : renderFn;
			const date = a instanceof Date ? a : undefined;
			
			let page = this._pages.get(relativePath);
			if (!page)
			{
				const windowArgs = { url: "https://localhost:8080", width: 1024, height: 1024 };
				//@ts-ignore
				const window = new Window(windowArgs);
				const doc = window.document;
				const documentElement = doc.createElement("html")
				const head = doc.createElement("head");
				const body = doc.createElement("body");
				documentElement.append(head, body);
				
				page = {
					document: doc,
					path: relativePath,
					renderFn: fn,
					date
				};
				
				this._pages.set(relativePath, page);
			}
			
			return page;
		}
		
		/** */
		get pages(): readonly Straw.Page[]
		{
			return Array.from(this._pages.values());
		}
		private readonly _pages = new Map<string, Straw.Page>();
		
		/**
		 * Specifies a favicon to generate during a call to .emit(), using the
		 * source image. The source directory is searched for an image file
		 * with the specified name.
		 * 
		 * Returns an array of HTMLElement objects that should be included
		 * in the <head> section of the page to reference the favicon.
		 */
		icon(iconFileName: string)
		{
			this.ensureRenderingPage();
			
			this.icons.add(iconFileName);
			const linkTags: HTMLLinkElement[] = [];
			
			for (const size of Straw.iconSizes.generic.concat(Straw.iconSizes.appleTouch))
			{
				const name = ImageProcessor.getIconFileName(iconFileName, size);
				const linkTag = raw.link({
					rel: Straw.iconSizes.generic.includes(size) ? "icon" : "apple-touch-icon",
					href: SiteFolder.icon + name,
				});
				
				// This attribute has to be assigned explicitly due to a deficiency of happy-dom.
				// See issue: https://github.com/capricorn86/happy-dom/issues/1185
				linkTag.setAttribute("sizes", size + "x" + size)
				linkTags.push(linkTag);
			}
			
			return linkTags;
		}
		
		/** Stores a set of icon file names to process and save to the icons folder. */
		private readonly icons = new Set<string>();
		
		/**
		 * 
		 */
		script(scriptFunction: () => void): HTMLScriptElement;
		/**
		 * A script URL to download and include in the /resources/scripts folder
		 */
		script(src: string): HTMLScriptElement;
		script(arg: (() => void) | string)
		{
			this.ensureRenderingPage();
			
			if (typeof arg === "string")
			{
				if (["http:", "https:", "file:"].some(s => arg.startsWith(s)))
					return raw.script({ src: arg });
				
				return raw.script(raw.text(arg));
			}
			
			const fnText = arg.toString().replace(/^\(\)\s*=>/, "");
			const htmlText = raw.text(fnText);
			const script = raw.script(htmlText);
			return script;
		}
		
		/**
		 * Emits the output to an optionally specified folder, which is relative
		 * to the current working directory.
		 */
		async emit(folder = "")
		{
			const root = Fila.new(process.cwd()).down(folder);
			const siteRoot = root.down(ProjectFolder.site);
			const sourceRoot = root.down(ProjectFolder.source);
			const imagesSaveRoot = root.down(ProjectFolder.site).down(SiteFolder.images);
			const imageRewriter = new ImageRewriter(sourceRoot, imagesSaveRoot);
			const pagesToMaybeAugment: string[] = [];
			
			for (const feedOptions of this._feeds.values())
			{
				const feedFolder = siteRoot.down(feedOptions.root || ".");
				const feedIndexFile = feedFolder.down("index.txt");
				const feedRelativeRoot = feedOptions.root || "/";
				
				const index = Array.from(this._pages.values())
					.filter(page => !!page.date)
					.filter(page => page.path.startsWith(feedRelativeRoot))
					.sort((a, b) => b.date!.getTime() - a.date!.getTime())
					.map(p => p.path)
					.join("\n");
				
				await feedIndexFile.writeText(index);
				
				// In order to be compliant with the webfeeds specification, it's necessary
				// to create a stand-in HTML page at the same location as the corresponding
				// index.txt file, which has the feed meta data, in the case when there is no
				// other index.html file exists at the location.
				if (!this._pages.has(feedRelativeRoot))
					this.page(feedRelativeRoot, () => this.createFeedMetaElements(feedOptions));
				else
					pagesToMaybeAugment.push(feedRelativeRoot);
			}
			
			for (const page of this._pages.values())
			{
				//# Render the page
				const g = globalThis as any;
				g.raw = new this.rawType(page.document);
				g.t = raw.text.bind(raw);
				
				try
				{
					this.renderingPage = page;
					const result = page.renderFn().flat();
					page.document.body.append(...result);
				}
				finally
				{
					this.renderingPage = null;
				}
				
				//# Hoist the meta elements
				const head = page.document.querySelector("head") as HTMLHeadElement;
				const metaQuery = page.document.body.querySelectorAll("LINK, META, TITLE, STYLE, BASE");
				for (let i = -1;  ++i < metaQuery.length;)
					head.append(metaQuery[i]);
				
				//# Fix the image URLs
				await imageRewriter.adjust(page.document.body);
				
				//# Inject any missing meta elements caused by any feed definitions.
				const feedOptions = this._feeds.get(page.path);
				if (feedOptions)
				{
					if (!head.querySelector(`META[name="author"]`))
						head.append(raw.meta({ name: "author", content: feedOptions.author }));
					
					if (!head.querySelector(`META[name="description"]`))
						head.append(raw.meta({ name: "description", content: feedOptions.description }));
					
					if (feedOptions.icon && !head.querySelector(`LINK[rel="icon"]`))
						head.append(...this.icon(feedOptions.icon));
				}
						
				const htmlContent = new HtmlElementEmitter({
					rawType: this.rawType,
					nodes: [page.document.documentElement]
				}).emit();
				
				let fila = siteRoot.down(page.path);
				if (!fila.name.endsWith(".html"))
					fila = fila.down("index.html");
				
				await fila.writeText(htmlContent);
			}
			
			//# Create the /static folder within the site if necessary
			const sourceStaticFolder = root.down(ProjectFolder.static);
			if (await sourceStaticFolder.exists())
			{
				const destStaticFolder = siteRoot.down(ProjectFolder.static);
				await destStaticFolder.writeSymlink(sourceStaticFolder);
			}
			
			//# Generate any icons
			for (const iconFileName of this.icons)
			{
				const imageFila = await ImageProcessor.findImage(sourceRoot, iconFileName);
				if (!imageFila)
					throw new Error("Image not found: " + imageFila);
				
				await ImageProcessor.processIcon(imageFila, siteRoot);
			}
		}
		
		/** */
		private createFeedMetaElements(feedOptions: IFeedOptions)
		{
			return [
				raw.meta({ name: "author", content: feedOptions.author }),
				raw.meta({ name: "description", content: feedOptions.description }),
				...(feedOptions.icon ? this.icon(feedOptions.icon) : [])
			];
		}
		
		/** */
		private ensureRenderingPage()
		{
			if (this.renderingPage === null)
				throw new Error("Cannot call this function at this time, because there is no page being rendered.");
		}
		
		private renderingPage: Page | null = null;
	}
	
	/** */
	function toArray<T>(item: T | T[]): T[]
	{
		return Array.isArray(item) ? item : [item];
	}
	
	/** */
	export interface Page
	{
		/**
		 * Specifies a relative path to the page within the website,
		 * for example, /products/my-product
		 */
		readonly path: string;
		
		/**
		 * Specifies an optional date that the page was created.
		 * If included, the page is considered a "post" and can be
		 * included within a webfeed definition.
		 */
		readonly date?: Date;
		readonly document: Document;
		readonly renderFn: PageRenderFn;
	}
	
	/** */
	export interface IFeedOptions
	{
		/**
		 * Stores the root path of the webfeed, where the index.txt file is located,
		 * and where to look to capture all nested webfeed posts. Specify a path
		 * that is relative to the working directory. If omitted, the path that is used
		 * is the working directory.
		 */
		readonly root?: string;
		
		/** */
		readonly author: string;
		
		/** */
		readonly description: string;
		
		/** */
		readonly icon?: string;
	}
}
