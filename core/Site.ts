
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
		page(relativePath: string, ...params: PageParam[]): void;
		/**
		 * Creates a webfeed-aware page at the specified location,
		 * which is posted at the specified time.
		 */
		page(relativePath: string, date: Date, ...params: PageParam[]): void;
		page(relativePath: string, a: any, ...params: PageParam[])
		{
			let date: Date | undefined;
			params = params.flat();
			
			if (!(a instanceof Date))
				params.unshift(a);
			else
				date = a;
			
			// Any CSS rules that were added to RawJS's global style sheet need to be relocated
			// to a new <style> element, which is then turned into a param.
			const headElements = Array.from(document.head.children);
			const rawJsStyleTag = headElements.find(e => e.className === "raw-style-sheet") as HTMLStyleElement;
			if (rawJsStyleTag?.sheet)
			{
				const sheet = rawJsStyleTag.sheet;
				if (sheet.cssRules.length > 0)
				{
					const cssText = sheet.toString();
					
					while (sheet.cssRules.length > 0)
						sheet.deleteRule(0);
					
					const localStyleTag = raw.style(raw.text(cssText.trim()));
					params.push(localStyleTag);
				}
			}
			
			relativePath = Fila.join(relativePath, "index.html");
			
			if (this._pages.has(relativePath))
				throw new Error("A page already exists at the path: " + relativePath);
			
			this._pages.set(relativePath, {
				path: relativePath,
				date,
				params,
				hasOnlyTextContent: false,
			});
		}
		
		/** */
		get pages(): readonly Straw.Page[]
		{
			return Array.from(this._pages.values());
		}
		private readonly _pages = new Map<string, Straw.Page>();
		
		/**
		 * Creates a file at the specified location.
		 * 
		 * This method is similar to straw.page, however, the relativePath
		 * argument is interpreted as a path to a file rather than a path to
		 * a folder that has an index.html file in it.
		 */
		file(relativePath: string, content: string)
		{
			if (this._pages.has(relativePath))
				throw new Error("A page already exists at the path: " + relativePath);
			
			this._pages.set(relativePath, {
				path: relativePath,
				params: [content],
				hasOnlyTextContent: true,
			});
		}
		
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
			if (iconFileName.includes("?"))
				throw new Error("Icon files cannot contain image processing parameters.");
			
			this.icons.add(iconFileName);
			const linkTags: HTMLLinkElement[] = [];
			
			for (const size of Straw.iconSizes.generic.concat(Straw.iconSizes.appleTouch))
			{
				const linkTag = raw.link({
					rel: Straw.iconSizes.generic.includes(size) ? "icon" : "apple-touch-icon",
					href: iconFileName + `?w=${size}`,
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
		 * Defines a function to execute on the client.
		 */
		script(clientFunction: () => void): HTMLScriptElement
		{
			const htmlText = raw.text("(" + clientFunction.toString() + ")()");
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
			const imageRewriter = new ImageRewriter(root);
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
				const pageFila = siteRoot.down(page.path);
				if (page.hasOnlyTextContent)
				{
					const textContent = page.params.filter(s => typeof s === "string").join("");
					pageFila.writeText(textContent);
					continue;
				}
				
				const params = page.params.flat().map(p => typeof p === "string" ? raw.text(p) : p);
				const head = raw.head();
				const body = raw.body(params);
				
				//# Hoist the meta elements
				const metaQuery = body.querySelectorAll("LINK, META, TITLE, STYLE, BASE");
				for (let i = -1;  ++i < metaQuery.length;)
					head.append(metaQuery[i]);
				
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
				
				//# Optimize duplicate head section elements
				const headElements = Array.from(head.children);
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
				
				//# Fix the image URLs
				await imageRewriter.adjust(head, body);
				
				const nodes = Array.from(head.children).concat(Array.from(body.children));
				const htmlContent = new HtmlElementEmitter({ nodes }).emit();
				await pageFila.writeText(htmlContent);
			}
			
			//# Create the /static folder within the site if necessary
			const sourceStaticFolder = root.down(ProjectFolder.static);
			if (await sourceStaticFolder.exists())
			{
				const destStaticFolder = siteRoot.down(ProjectFolder.static);
				
				// The Cloudflare build-bot doesn't support symlinks, so the files
				// need to be copied instead of symlinked. This doesn't matter during
				// build because everything is discarded after a successful build.
				inCloudflareBuildBot ?
					await sourceStaticFolder.move(destStaticFolder) :
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
	
	const inCloudflareBuildBot =
		typeof process === "object" &&
		typeof process.env === "object" &&
		process.env.CI === "true" &&
		!!process.env.CF_PAGES;
	
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
		
		/**
		 * Specifies whether the Page was created with the Straw.file
		 * method (and contains raw text content).
		 */
		readonly hasOnlyTextContent: boolean;
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
