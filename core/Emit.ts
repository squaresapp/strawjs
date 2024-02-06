
namespace Straw
{
	/**
	 * Emits the output to an optionally specified folder, which is relative
	 * to the current working directory.
	 */
	export async function emit(folder = "")
	{
		// Wait until the next turn of the event loop before running
		// the emit process. This defends against the case when the
		// call to straw.emit() isn't at the bottom of the file, which
		// provides an opportunity for the other parts of the user
		// code to define pages.
		await new Promise(r => setTimeout(r));
		
		if (!NODE)
			await Straw.maybeSetupBrowser();
		
		const root = new Fila(folder);
		const siteRoot = root.down(ProjectFolder.site);
		const sourceRoot = root.down(ProjectFolder.source);
		const imageRewriter = new ImageRewriter(root);
		const pageMap = await processIndexTsxFiles(sourceRoot);
		
		for (const page of pageMap.values())
		{
			const pageFila = siteRoot.down(page.path);
			if (page.isTextOnly)
			{
				const textContent = page.params.filter(s => typeof s === "string").join("");
				pageFila.writeText(textContent);
				continue;
			}
			
			const params = page.params.flat().map(p => typeof p === "string" ? raw.text(p) : p);
			const head = raw.head();
			const body = raw.body();
			
			// If params has a head element, then relocate all it's elements to the newly constructed head
			for (const param of params)
			{
				if (!Raw.is.element(param))
					continue;
				
				if (param.tagName === "HEAD")
					head.append(...Array.from(param.childNodes));
				
				else if (param.tagName === "BODY")
				{
					body.append(...Array.from(param.childNodes));
					body.classList.add(...param.className.split(/\s+/));
					
					for (const attr of Array.from(param.attributes))
						if (attr.name !== "class")
							body.setAttribute(attr.name, attr.value);
				}
				else body.append(param);
			}
			
			//# Hoist the meta elements
			const metaQuery = body.querySelectorAll("LINK, META, TITLE, STYLE, BASE, ICON, FEED");
			for (let i = -1;  ++i < metaQuery.length;)
				head.append(metaQuery[i]);
			
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
			
			//# Create any webfeed files
			for (const feedElement of Array.from(head.querySelectorAll("feed")))
			{
				feedElement.remove();
				const include = feedElement.getAttribute("include") || ".";
				const regex = convertGlobToRegEx(include);
				const feedIndexFile = pageFila.up().down("index.txt");
				
				const pages = Array.from(pageMap.values());
				const index = pages
					.filter(page => regex.test(page.path))
					.sort((a, b) => b.dateCreated - a.dateCreated)
					.map(p => p.path)
					.join("\n");
				
				await feedIndexFile.writeText(index);
			}
			
			//# Generate any icons
			for (const iconElement of Array.from(head.querySelectorAll("icon")))
			{
				const src = iconElement.getAttribute("src");
				if (src)
				{
					const imageFila = await ImageProcessor.findImage(sourceRoot, src);
					if (!imageFila)
						throw new Error("Image not found: " + imageFila);
					
					await ImageProcessor.processIcon(imageFila, siteRoot);
					const linkTags = createIcon(src);
					iconElement.replaceWith(...linkTags);
				}
				else iconElement.remove();
			}
			
			//# Fix the image URLs
			await imageRewriter.adjust(head, body);
			
			const nodes = Array.from(head.children);
			
			if (body.attributes.length === 0)
				nodes.push(...Array.from(body.children));
			else
				nodes.push(body);
			
			const htmlContent = new HtmlElementEmitter({ nodes }).emit();
			await pageFila.writeText(htmlContent);
		}
		
		await Promise.all([
			//# Create the /static folder within the site if necessary
			new Promise<void>(async r =>
			{
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
				
				r();
			}),
			//# Copy over the files that start with a caret ^
			new Promise<void>(async r =>
			{
				const sourceFilas = await Util.findFiles(
					sourceRoot,
					f => f.name.startsWith(Straw.copyPrefix));
				
				await Promise.all(
					sourceFilas.map(sourceFila => new Promise<void>(async r =>
					{
						const comp = sourceFila.components.slice(sourceRoot.components.length);
						comp[comp.length - 1] = sourceFila.name.slice(Straw.copyPrefix.length);
						const targetFila = siteRoot.down(...comp);
						await sourceFila.copy(targetFila);
						r();
					}))
				);
				
				r();
			})
		]);
	}
		
	/** */
	function createIcon(src: string)
	{
		const linkTags: HTMLLinkElement[] = [];
		
		for (const size of Straw.iconSizes.generic.concat(Straw.iconSizes.appleTouch))
		{
			const linkTag = raw.link({
				rel: Straw.iconSizes.generic.includes(size) ? "icon" : "apple-touch-icon",
				href: src + `?w=${size}`,
			});
			
			// This attribute has to be assigned explicitly due to a deficiency of happy-dom.
			// See issue: https://github.com/capricorn86/happy-dom/issues/1185
			linkTag.setAttribute("sizes", size + "x" + size);
			linkTags.push(linkTag);
		}
		
		return linkTags;
	}
		
	/** */
	async function processIndexTsxFiles(sourceRoot: Fila)
	{
		const pages = new Map<string, Page>(); // Page Path => Params
		const indexTsxFilas = await Util.findFiles(
			sourceRoot,
			f => f.name.toLowerCase() === "index.tsx");
		
		for (const indexTsxFila of indexTsxFilas)
		{
			const indexTsxText = await indexTsxFila.readText();
			const jsCode = Straw.ts.transpile(indexTsxText, {
				module: Straw.ts.ModuleKind.System,
				target: Straw.ts.ScriptTarget.ES2015,
				jsx: Straw.ts.JsxEmit.React,
				jsxFactory: "Straw.jsx"
			});
			
			const [dateCreated, dateModified] = await Promise.all([
				indexTsxFila.getCreatedTicks(),
				indexTsxFila.getModifiedTicks(),
			]);
			
			try
			{
				Straw.setPageCaptureCallback(params =>
				{
					const path = indexTsxFila.path
						.slice(sourceRoot.path.length)
						.replace(/\.tsx$/, ".html");
					
					pages.set(path, {
						path,
						dateCreated,
						dateModified,
						isTextOnly: false,
						params: convertRawPageToPageParam(params)
					});
				});
				
				Straw.evaluate(jsCode);
			}
			catch (e)
			{
				console.error("An error occured while trying to evaluate the file: " + indexTsxFila.path);
				continue;
			}
			finally
			{
				Straw.setPageCaptureCallback();
			}
		}
		
		// Any CSS rules that were added to RawJS's global style sheet need to be relocated
		// to a new <style> element, which is then turned into a param.
		
		/*
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
		*/
		
		return pages;
	}
		
	/** */
	function convertRawPageToPageParam(params: Raw.Param[])
	{
		return params.filter(p => Raw.is.element(p) || typeof p === "string") as PageParam[];
	}
	
	export type PageParam = Element | Element[] | string | string[];
	
	/** */
	export interface Page
	{
		/**
		 * Specifies a relative path to the page within the website,
		 * for example, /products/my-product
		 */
		readonly path: string;
		
		/**
		 * Gets the date that the page was created.
		 */
		readonly dateCreated: number;
		
		/**
		 * Gets the date that the page was last modified.
		 */
		readonly dateModified: number;
		
		/**
		 * Specifies the Nodes to include in the page, which get
		 * organized into body and head elements during emit.
		 */
		readonly params: PageParam[];
		
		/**
		 * Specifies whether the Page was created with the Straw.file
		 * method (and contains raw text content).
		 */
		readonly isTextOnly: boolean;
	}
	
	const inCloudflareBuildBot =
		typeof process === "object" &&
		typeof process.env === "object" &&
		process.env.CI === "true" &&
		!!process.env.CF_PAGES;
}

namespace Straw
{
	/**
	 * @internal
	 * Calls the eval() function in the top-level Scope of Straw.
	 */
	export function evaluate(evalCode: string)
	{
		eval(evalCode);
	}
}
