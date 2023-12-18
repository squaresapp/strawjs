
namespace Straw
{
	export type PageParam = Element | Element[] | string | string[];
	let photon: typeof import("@silvia-odwyer/photon-node");
	
	/** */
	export class Site
	{
		/** */
		constructor() { }
		
		/**
		 * Generates a favicon using the source image at the specified path,
		 * and returns the HTMLElement objects that should be included
		 * in the <head> section of the page to reference the favicon.
		 */
		icon(path: string)
		{
			return [] as HTMLElement[];
		}
		
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
			this._feeds.set(options.root, options);
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
		
		/** */
		image(base: string, options: ImageOptions = {})
		{
			return createReference(base, options);
		}
		
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
		
		/** */
		async emit()
		{
			if (!hasInit)
			{
				hasInit = true;
				const g = globalThis as any;
				g.Fila = require("fila-core").Fila;
				(require("fila-node") as typeof import("fila-node")).FilaNode.use();
			}
			
			const root = Fila.new(process.cwd());
			const config = await readPackageJson();
			const outRoot = root.down(config.straw.out);
			const imagesRoot = root.down(config.straw.images);
			const imagesOutputRoot = outRoot.down(Folder.images);
			const staticRoot = root.down(config.straw.static);
			
			// These elements should be written later			
			const metaElements = new Map<string, HTMLElement[]>();
			
			for (const feedOptions of this._feeds.values())
			{
				const feedFolder = outRoot.down(feedOptions.root);
				const feedIndexFile = feedFolder.down("index.txt");
				const posts: Post[] = [];
				
				for (const [path, post] of this._posts)
					if( outRoot.down(path).path.startsWith(feedFolder.path))
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
				// write the meta elements to a map, and 
				
				const type = 
					feedOptions.icon.endsWith(".png") ? "image/png" :
					feedOptions.icon.endsWith(".jpg") ? "image/jpeg" : "image/jpeg";
				
				const elements = [
					raw.meta({ name: "author", content: feedOptions.author }),
					raw.meta({ name: "description", content: feedOptions.description }),
					raw.link({ rel: "icon", type, href: feedOptions.icon }),
				];
				
				if (this._pages.has(feedFolder.path))
				{
					metaElements.set(feedOptions.root, elements);
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
				await this.scanForImages(
					imagesRoot,
					outRoot,
					...post.sections);
				
				const htmlContent = executeEmit({ doctype: true }, ...post.sections);
				
				let fila = outRoot.down(post.path);
				if (!fila.name.endsWith(".html"))
					fila = fila.down("index.html");
				
				await fila.writeText(htmlContent);
			}
			
			for (const [path, page] of this._pages)
			{
				this.hoistMetaElements(page.documentElement);
				await this.scanForImages(
					imagesRoot,
					outRoot,
					page.documentElement);
				
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
				
				let fila = outRoot.down(path);
				if (!fila.name.endsWith(".html"))
					fila = fila.down("index.html");
				
				await fila.writeText(htmlContent);
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
		
		/** */
		private async scanForImages(
			imagesRoot: Fila,
			outputRoot: Fila,
			...containers: HTMLElement[])
		{
			for (const container of containers)
			{
				const walker = document.createTreeWalker(container);
				while (walker.nextNode())
				{
					const e = walker.currentNode;
					if (!Raw.is.element(e))
						continue;
					
					const tag = e.tagName;
					const attributes = [
						e.getAttributeNode("src"),
						e.getAttributeNode("href"),
						tag === "embed" && e.getAttributeNode("source"),
						tag === "video" && e.getAttributeNode("poster"),
						tag === "object" && e.getAttributeNode("data"),
						tag === "form" && e.getAttributeNode("action")
					];
					
					for (const attr of attributes)
					{
						if (!attr || !attr.value)
							continue;
						
						const parsed = await this.replaceReference(
							imagesRoot,
							outputRoot,
							attr.value);
						
						if (parsed)
							attr.value = parsed.replacedValue;
					}
					
					for (const property of Straw.cssPropertiesWithUrls)
					{
						const val = e.style.getPropertyValue(property);
						const parsed = await this.replaceReference(
							imagesRoot,
							outputRoot,
							val);
						
						if (parsed)
							e.style.setProperty(property, parsed.replacedValue);
					}
				}
			}
		}
		
		/** */
		private async replaceReference(
			imagesRoot: Fila,
			outputRoot: Fila,
			reference: string)
		{
			const start = reference.indexOf(imagePrefix);
			if (start < 0)
				return null;
			
			const end = reference.indexOf(imageSuffix, start);
			const base64Text = reference.slice(start + imagePrefix.length, end);
			const clearText = atob(base64Text);
			const marker: ImageMarker = tryParseJson(clearText)!;
			const base = (() =>
			{
				for (const ext of imageExtensions)
					if (marker.base.endsWith(ext))
						return marker.base.slice(0, -ext.length);
				
				return marker.base;
			})();
			
			const imageFila = await findImage(imagesRoot, marker.base);
			if (!imageFila)
			{
				console.error("Image could not be resolved: " + marker.base);
				debugger;
				return null;
			}
			
			const imageCrc = await computeFileCrc(imageFila);
			const parts = [base, imageCrc];
			
			if (marker.width)
				parts.push(marker.width + "w");
			
			if (marker.height)
				parts.push(marker.height + "h");
			
			if (marker.grayscale)
				parts.push("g");
			
			if (marker.blur)
				parts.push(marker.blur + "b");
			
			const finalFileName = parts.join(".") + imageFila.extension;
			const finalFila = outputRoot.down(finalFileName);
			
			if (!await finalFila.exists())
			{
				photon ||= require("@silvia-odwyer/photon-node");
				
				const bytes = new Uint8Array(await imageFila.readBinary());
				let photonImage = photon.PhotonImage.new_from_byteslice(bytes);
				const originalWidth = photonImage.get_width();
				const originalHeight = photonImage.get_height();
				const ratio = originalWidth / originalHeight;
				
				let width = 0;
				let height = 0;
				
				if (marker.width && !marker.height)
				{
					width = marker.width;
					height = marker.width / ratio;
				}
				else if (!marker.width && marker.height)
				{
					width = marker.height * ratio;
					height = marker.height;
				}
				else if (marker.width && marker.height)
				{
					width = marker.width;
					height = marker.height
				}
				else
				{
					width = originalWidth;
					height = originalHeight;
				}
				
				if (width !== originalWidth || height !== originalHeight)
					photonImage = photon.resize(photonImage, width, height, 5);
				
				if (marker.grayscale)
					photon.grayscale(photonImage);
				
				if (marker.blur)
					photon.gaussian_blur(photonImage, marker.blur);
				
				await finalFila.writeBinary(photonImage.get_bytes());
			}
			
			const replacedValue = 
				reference.slice(0, start) +
				Folder.images +
				finalFileName +
				reference.slice(end + imageSuffix.length);
			
			return { marker, replacedValue };
		}
	}
	
	let hasInit = false;
	
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
		 * and where to look to capture all nested webfeed posts.
		 */
		readonly root: string;
		
		/** */
		readonly author: string;
		
		/** */
		readonly description: string;
		
		/** */
		readonly icon: string;
	}
	
	/** */
	export interface ImageOptions
	{
		width?: number;
		height?: number;
		grayscale?: boolean;
		blur?: number;
	}
	
	/** */
	export interface ImageMarker extends ImageOptions
	{
		base: string;
	}
	
	/**
	 * 
	 */
	function createReference(base: string, options: ImageOptions)
	{
		const marker: ImageMarker = { base, ...options };
		
		return (
			imagePrefix + 
			btoa(JSON.stringify(marker)) + 
			imageSuffix
		);
	}
	
	const imagePrefix = "straw-local://";
	const imageSuffix = "###";
	const imageExtensions = [".gif", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".svg"];
	
	/** */
	async function findImage(searchRoot: Fila, fileBaseName: string)
	{
		const queue = await searchRoot.readDirectory();
		const hasExtension = imageExtensions.some(e => fileBaseName.endsWith(e));
		
		// If "base" has a slash in it, then it's treated assumed to be an absolute path.
		if (fileBaseName.includes("/"))
		{
			if (hasExtension)
			{
				const fila = searchRoot.down(fileBaseName);
				if (await fila.exists())
					return fila;
			}
			else for (const fila of imageExtensions.map(e => searchRoot.down(fileBaseName)))
				if (await fila.exists())
					return fila;
		}
		
		while (queue.length)
		{
			const fila = queue.shift();
			if (!fila)
				return null;
			
			if (await fila.isDirectory())
				queue.push(...await fila.readDirectory());
			
			if (hasExtension)
			{
				if (fila.name === fileBaseName)
					return fila;
			}
			else if (imageExtensions.map(e => fileBaseName + e).some(s => s === fila.name))
				return fila;
		}
		return null;
	}
	
	/** */
	async function computeFileCrc(fila: Fila)
	{
		const crc = require("crc-32") as typeof import("crc-32");
		const contents = new Uint8Array(await fila.readBinary());
		const num = crc.buf(contents) + (2 ** 32 / 2);
		return num.toString(36);
	}
	
	/**
	 * @internal
	 * Generic function for acquiring identifiers either from a require() function
	 * in the case when running in Node.JS, or from the globalThis in the case
	 * when running in the browser.
	 */
	function get(specifier: string, ...identifiers: string[])
	{
		return typeof process === "object" && !!process.argv ?
			require(specifier) :
			Object.fromEntries(identifiers.map(id => [id, ((globalThis as any)[id])]));
	}
	
	/**
	 * Reads the relavant content from the package.json file
	 * located within the current working directory.
	 */
	async function readPackageJson()
	{
		const packageJson: IPackageJson = {
			straw: {
				images: ".",
				out: "./site/",
				static: "./static/",
			}
		};
		
		const root = Fila.new(process.cwd());
		const packageFila = root.down("package.json");
		
		if (await packageFila.exists())
		{
			const packageJsonText = await root.down("package.json").readText();
			
			const json = Straw.tryParseJson<IPackageJson>(packageJsonText);
			if (json?.straw)
			{
				if (json.straw.images && typeof json.straw.images === "string")
					packageJson.straw.images = json.straw.images;
				
				if (json.straw.out && typeof json.straw.out === "string")
					packageJson.straw.out = json.straw.out;
				
				if (json.straw.static && typeof json.straw.static === "string")
					packageJson.straw.static = json.straw.static;
			}
		}
		
		return packageJson;
	}
}
