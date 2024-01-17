
namespace Straw
{
	/** @internal */
	export namespace Util
	{
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
	}
}