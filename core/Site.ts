
namespace Straw
{
	export type PageParam = Element | Element[] | string | string[];
	
	/** */
	export class Site
	{
		/** */
		constructor() { }
		
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
		page(relativePath: string, ...params: PageParam[]): Page;
		page(relativePath: string, date: Date, ...params: PageParam[]): Page;
		page(relativePath: string, a: any, ...params: PageParam[])
		{
			let date: Date | undefined;
			
			if (!(a instanceof Date))
				params.unshift(a);
			else
				date = a;
			
			let page = this._pages.get(relativePath);
			if (!page)
			{
				this._pages.set(relativePath, page = {
					path: relativePath,
					date,
					params
				});
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
				linkTag.setAttribute("sizes", size + "x" + size);
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
			// Wait until the next turn of the event loop before running
			// the emit process. This defends against the case when the
			// call to straw.emit() isn't at the bottom of the file, which
			// provides an opportunity for the other parts of the user
			// code to define pages.
			await new Promise(r => setTimeout(r));
			
			const root = Fila.new(process.cwd()).down(folder);
			const siteRoot = root.down(ProjectFolder.site);
			const sourceRoot = root.down(ProjectFolder.source);
			const imagesSaveRoot = root.down(ProjectFolder.site).down(SiteFolder.images);
			const imageRewriter = new ImageRewriter(sourceRoot, imagesSaveRoot);
			const pagesToMaybeAugment: string[] = [];
			const style = document.head.querySelector<HTMLStyleElement>("STYLE.raw-style-sheet");
			const rawCssRules = Array.from(style?.sheet?.cssRules || []);
			
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
					this.page(feedRelativeRoot, this.createFeedMetaElements(feedOptions));
				else
					pagesToMaybeAugment.push(feedRelativeRoot);
			}
			
			for (const page of this._pages.values())
			{
				const params = page.params.flat().map(p => typeof p === "string" ? raw.text(p) : p);
				const head = raw.head();
				const body = raw.body(params);
				
				//# Hoist the meta elements
				const metaQuery = body.querySelectorAll("LINK, META, TITLE, STYLE, BASE");
				for (let i = -1;  ++i < metaQuery.length;)
					head.append(metaQuery[i]);
				
				//# Fix the image URLs
				await imageRewriter.adjust(body);
				
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
				
				//# Relocate any relevant CSS rules that landed in the global style sheet.
				if (rawCssRules.length > 0)
				{
					const classNamesInUse = new Set<string>();
					for (const e of Util.walkElementTree(body))
					{
						e.classList.forEach(cls =>
						{
							if (/^raw-[a-z0-9]{10,}$/.test(cls))
								classNamesInUse.add(cls);
						});
					}
					
					const rulesExtracted: string[] = [];
					for (let i = -1; ++i < rawCssRules.length;)
					{
						const rule = rawCssRules[i];
						
						if (/^\.raw-[a-z0-9]{10,}/.test(rule.cssText))
						{
							const clsEnd = rule.cssText.slice(10).search(/[^a-z0-9]/) + 10;
							const cls = rule.cssText.slice(1, clsEnd);
							if (classNamesInUse.has(cls))
								rulesExtracted.push(rule.cssText);
						}
					}
					
					if (rulesExtracted.length > 0)
					{
						const style = raw.style();
						style.textContent = rulesExtracted.join("\n");
						head.append(style);
					}
				}
				
				const nodes = Array.from(head.children).concat(Array.from(body.children));
				const htmlContent = new HtmlElementEmitter({ nodes }).emit();
				
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
		
		/**
		 * Specifies the Nodes to include in the page, which get
		 * organized into body and head elements during emit.
		 */
		readonly params: PageParam[];
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
