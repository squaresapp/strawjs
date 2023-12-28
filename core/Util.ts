
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
			const crc = require("crc-32") as typeof import("crc-32");
			const contents = new Uint8Array(await fila.readBinary());
			const num = crc.buf(contents) + (2 ** 32 / 2);
			return num.toString(36);
		}
		
		/**
		 * Enumerates through the decendents of the specified container element.
		 */
		export function * walkElementTree(container: HTMLElement)
		{
			const doc = container.ownerDocument;
			const walker = doc.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
			while (walker.nextNode())
				if (walker.currentNode instanceof HTMLElement)
					yield walker.currentNode;
		}
	}
}