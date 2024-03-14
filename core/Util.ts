
namespace Straw
{
	/** @internal */
	export namespace Util
	{
		/** */
		export function asArray<T>(maybeArray: T | T[]): T[]
		{
			return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
		}
		
		/** */
		export function tryParseJson<T = any>(json: any): T | null
		{
			try
			{
				return JSON.parse(json);
			}
			catch (e) { }
			
			return null;
		}
		
		/**
		 * Computes a string-based CRC value for the contents of
		 * the file located at the specified location
		 */
		export async function computeFileCrc(fila: Fila)
		{
			const contents = new Uint8Array(await fila.readBinary());
			const num = Straw.crc32.buf(contents) + (2 ** 32 / 2);
			return num.toString(36);
		}
		
		/** */
		export async function findFiles(sourceRoot: Fila, filaFn: (fila: Fila) => boolean)
		{
			const filas: Fila[] = [sourceRoot];
			const indexTsxFiles: Fila[] = [];
			
			for (let i = -1; ++i < filas.length;)
			{
				const fila = filas[i];
				if (await fila.isDirectory())
					filas.push(...await fila.readDirectory());
				
				else if (filaFn(fila))
					indexTsxFiles.push(fila);
			}
			
			return indexTsxFiles;
		}
		
		/**
		 * Enumerates through the decendents of the specified container element.
		 */
		export function * walkElementTree(container: HTMLElement)
		{
			yield container;
			const doc = container.ownerDocument;
			const filter = 1; // NodeFilter.SHOW_ELEMENT
			const walker = doc.createTreeWalker(container, filter);
			while (walker.nextNode())
				if (walker.currentNode instanceof HTMLElement)
					yield walker.currentNode;
		}
		
		/**
		 * An enumerator that walks through the TypeScript AST,
		 * depth-first, starting at the specified root node.
		 */
		export function * walkAbstractSyntaxTree(sourceFile: import("typescript").SourceFile)
		{
			function * recurse(node: TsNode): IterableIterator<TsNode>
			{
				yield node;
				
				const children = node.getChildren(sourceFile);
				for (const child of children)
					yield * recurse(child);
			}
			
			yield * recurse(sourceFile);
		}
		
		/**
		 * @internal
		 * Gets the tag name of the specified JsxNode, using an undocumented
		 * property in the TypeScript compiler API.
		 */
		export function getTagName(withTagName: { tagName: JsxTagNameExpression })
		{
			return (withTagName.tagName as any).escapedText || "";
		}
		
		/** */
		export function createIcon(src: string)
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
		export function createElement(tagName: string, properties: Record<string, any>, params: Raw.Param[])
		{
			const e = document.createElement(tagName);
			
			for (const [k, v] of Object.entries(properties))
				e.setAttribute(k, v);
			
			return raw.get(e)(params);
		}
	}
}