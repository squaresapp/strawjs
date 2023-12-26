
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
				linkTag.setAttribute("sizes", size + "x" + size)
				linkTags.push(linkTag);
			}
			
			return linkTags;
		}
		
		/** Stores a set of icon file names to process and save to the icons folder. */
		private readonly icons = new Set<string>();
		
		/**
		 * Creates a webfeed post at the specified location.
		 */
		post(path: string, date: Date, ...sections: HTMLElement[])
		{
			const post: Straw.Post = { path, date, sections };
			this._posts.set(path, post);
			return post;
		}
		
		private readonly _posts = new Map<string, Straw.Post>();
		
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
		page(path: string, ...params: PageParam[])
		{
			let page = this._pages.get(path);
			if (!page)
			{
				const doc = window.document;
				const documentElement = doc.createElement("html")
				const head = doc.createElement("head");
				const body = doc.createElement("body");
				documentElement.append(head, body);
				
				page = {
					documentElement,
					body,
					head,
					path: process.cwd()
				};
				
				this._pages.set(path, page);
			}
			
			// Is this going to handle strings alright?
			for (const param of params.flat())
				page.body.append(param);
			
			return page;
		}
		
		/** */
		get pages(): readonly Straw.Page[]
		{
			return Array.from(this._pages.values());
		}
		private readonly _pages = new Map<string, Straw.Page>();
		
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
			const root = Fila.new(process.cwd()).down(folder);
			const siteRoot = root.down(ProjectFolder.site);
			const sourceRoot = root.down(ProjectFolder.source);
			const imagesSaveRoot = root.down(ProjectFolder.site).down(SiteFolder.images);
			const imagePipeline = new ImageRewriter(sourceRoot, imagesSaveRoot);
			
			// These elements should be written later			
			const metaElements = new Map<string, HTMLElement[]>();
			
			for (const feedOptions of this._feeds.values())
			{
				const feedFolder = siteRoot.down(feedOptions.root || ".");
				const feedIndexFile = feedFolder.down("index.txt");
				const posts: Post[] = [];
				
				for (const [path, post] of this._posts)
					if( siteRoot.down(path).path.startsWith(feedFolder.path))
						posts.push(post);
				
				const index = posts
					.sort((a, b) => b.date.getTime() - a.date.getTime())
					.map(p => p.path)
					.join("\n");
				
				await feedIndexFile.writeText(index);
				
				// It's necessary to drop an index.html file at the same location as the
				// corresponding index.txt file, which has the feed meta data. However,
				// we don't want to just drop this here, because there could be another
				// index.html file and we don't want to override it. So instead, we just
				// write the meta elements to a map.
				
				const elements: HTMLElement[] = [
					raw.meta({ name: "author", content: feedOptions.author }),
					raw.meta({ name: "description", content: feedOptions.description }),
				];
				
				if (feedOptions.icon)
					elements.push(...this.icon(feedOptions.icon));
				
				if (this._pages.has(feedFolder.path))
				{
					metaElements.set(feedOptions.root || ".", elements);
				}
				else
				{
					const htmlContent = executeEmit({ doctype: true }, ...elements);
					const indexHtmlFila = feedFolder.down("index.html");
					await indexHtmlFila.writeText(htmlContent);
				}
			}
			
			for (const post of this._posts.values())
			{
				await imagePipeline.adjust(...post.sections);
				const htmlContent = executeEmit({ doctype: true }, ...post.sections);
				
				let fila = siteRoot.down(post.path);
				if (!fila.name.endsWith(".html"))
					fila = fila.down("index.html");
				
				await fila.writeText(htmlContent);
			}
			
			for (const [path, page] of this._pages)
			{
				this.hoistMetaElements(page.documentElement);
				await imagePipeline.adjust(page.documentElement);
				
				const elementsToInject = metaElements.get(path);
				if (elementsToInject)
				{
					metaElements.delete(path);
					page.head.append(...elementsToInject);
					
					// This should probably conditionally inject these only
					// in the case when they don't already have other meta
					// tags defined with the same names.
				}
				
				const htmlContent = executeEmit({ doctype: true }, page.documentElement);
				
				let fila = siteRoot.down(path);
				if (!fila.name.endsWith(".html"))
					fila = fila.down("index.html");
				
				await fila.writeText(htmlContent);
			}
			
			// Create the /static folder within the site if necessary
			const sourceStaticFolder = root.down(ProjectFolder.static);
			if (await sourceStaticFolder.exists())
			{
				const destStaticFolder = siteRoot.down(ProjectFolder.static);
				await destStaticFolder.writeSymlink(sourceStaticFolder);
			}
			
			// Generate any icons
			for (const iconFileName of this.icons)
			{
				const imageFila = await ImageProcessor.findImage(sourceRoot, iconFileName);
				if (!imageFila)
					throw new Error("Image not found: " + imageFila);
				
				await ImageProcessor.processIcon(imageFila, siteRoot);
			}
		}
		
		/** */
		private hoistMetaElements(docElement: HTMLHtmlElement)
		{
			const metaQuery = docElement.querySelectorAll("LINK, META, TITLE, STYLE, BASE");
			const metaElements: Element[] = [];
			
			for (let i = -1;  ++i < metaQuery.length;)
				metaElements.push(metaQuery[i]);
			
			const head = docElement.querySelector("head") as HTMLHeadElement;
			head.append(...metaElements);
		}
	}
	
	/** */
	export interface Page
	{
		readonly path: string;
		readonly documentElement: HTMLHtmlElement;
		readonly head: HTMLHeadElement;
		readonly body: HTMLBodyElement;
	}
	
	/** */
	export interface Post
	{
		readonly path: string;
		readonly date: Date;
		readonly sections: HTMLElement[];
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
