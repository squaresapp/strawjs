
namespace Straw
{
	let photon: typeof import("@silvia-odwyer/photon-node");
	
	/**
	 * @internal
	 */
	export class ImagePipeline
	{
		/** */
		constructor(
			private readonly imageSearchRoot: Fila,
			outputRoot: Fila)
		{
			this.imagesFolder = outputRoot.down(Folder.images);
		}
		
		private readonly imagesFolder: Fila;
		
		/**
		 * Scans the specified top-level HTML elements, and their nested elements,
		 * for elements that have attributes and styles that reference external image files.
		 * These images are extracted and copied to the output location, and the
		 * attribute and style values are replaced with new values that reference the
		 * image in the output location.
		 * 
		 * The function also deals with image processing. Non-SVG Image URLs can
		 * have parameters such as width= and height=, which are processed by Photon.
		 */
		async adjust(...containers: HTMLElement[])
		{
			for (const x of scanForImages(containers))
			{
				if (x instanceof DiscoveredProperty)
				{
					const parsedDatas = parseImageUrl(x.value);
					let propertyValue = x.value;
					
					for (let i = parsedDatas.length; i-- > 0;)
					{
						const params = parsedDatas[i];
						const imageFila = await findImage(this.imageSearchRoot, params.name);
						if (!imageFila)
							throw new Error("No image found with name: " + params.name);
						
						const processedFilePath = await this.processImage(imageFila, params);
						
						propertyValue = 
							propertyValue.slice(0, params.start) +
							processedFilePath +
							propertyValue.slice(params.end);
					}
					
					x.element.style.setProperty(x.property, propertyValue);
				}
				else if (x instanceof Attr)
				{
					const params = parseImageUrl(x.value)[0];
					const imageFila = await findImage(this.imageSearchRoot, params.name);
					if (!imageFila)
						throw new Error("No image found with name: " + params.name);
					
					x.value = await this.processImage(imageFila, params);
				}
			}
		}
		
		/** */
		private async processImage(imageFila: Fila, params: ImageParams)
		{
			const imageCrc = await computeFileCrc(imageFila);
			const nameNoExt = imageFila.name.slice(0, -imageFila.extension.length);
			const parts = [nameNoExt, imageCrc];
			let finalFileName = "";
			
			if (imageFila.extension === ".svg")
			{
				finalFileName = parts.join(".") + imageFila.extension;
				await imageFila.copy(this.imagesFolder.down(finalFileName));
			}
			else
			{
				if (params.width)
					parts.push(params.width + "w");
				
				if (params.height)
					parts.push(params.height + "h");
				
				if (params.gray)
					parts.push("g");
				
				if (params.blur)
					parts.push(params.blur + "b");
				
				finalFileName = parts.join(".") + imageFila.extension;
				const finalFila = this.imagesFolder.down(finalFileName);
				
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
					
					if (params.width && !params.height)
					{
						width = params.width;
						height = params.width / ratio;
					}
					else if (!params.width && params.height)
					{
						width = params.height * ratio;
						height = params.height;
					}
					else if (params.width && params.height)
					{
						width = params.width;
						height = params.height
					}
					else
					{
						width = originalWidth;
						height = originalHeight;
					}
					
					if (width !== originalWidth || height !== originalHeight)
						photonImage = photon.resize(photonImage, width, height, 5);
					
					if (params.gray)
						photon.grayscale(photonImage);
					
					if (params.blur)
						photon.gaussian_blur(photonImage, params.blur);
					
					await finalFila.writeBinary(photonImage.get_bytes());
				}
			}
			
			return Folder.images + finalFileName;
		}
	}
	
	/**
	 * Scans for HTML attributes and CSS properties that have URLs
	 * in them that refer to external resource files.
	 */
	function scanForImages(within: HTMLElement | HTMLElement[])
	{
		const containers = Array.isArray(within) ? within : [within];
		const reg = /^https?:\/\//;
		const result: (Attr | DiscoveredProperty)[] = [];
		
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
					tag === "embed" && e.getAttributeNode("source"),
					tag === "video" && e.getAttributeNode("poster"),
					tag === "object" && e.getAttributeNode("data"),
					tag === "form" && e.getAttributeNode("action"),
					tag === "link" && 
						(e.getAttribute("rel") ===  "icon" || e.getAttribute("rel") === "shortcut icon") && 
						e.getAttributeNode("href"),
				];
				
				for (const attr of attributes)
					if (attr && attr.value)
						if (!reg.test(attr.value))
							result.push(attr);
				
				for (const property of Straw.cssPropertiesWithUrls)
				{
					const val = e.style.getPropertyValue(property);
					if (val && !reg.test(val) && val.includes("url("))
						result.push(new DiscoveredProperty(e, property, val));
				}
			}
		}
		
		return result;
	}
	
	/** */
	class DiscoveredProperty
	{
		constructor(
			readonly element: HTMLElement,
			readonly property: string,
			readonly value: string
		) { }
	}
	
	/**
	 * Parses image urls, in the format image.png?width=10,height=10
	 * The image URL may be encapsulated with in a CSS url() definition,
	 * such as url (image.png?width=10,height=10).
	 * The supplied string may also contain multiple instances of these
	 * image definitions.
	 */
	function parseImageUrl(value: string): ImageParams[]
	{
		const files: ImageParams[] = [];
		const urls: { url: string; start: number, end: number }[] = [];
		const reg = /url\("?([/A-Za-z0-9\.\-\_]+(\?[a-z=\,\d+]+)?)"?\)/g;
		
		if (value.includes("url("))
		{
			let lastEnd = 0;
			const matches = value.matchAll(reg);
			
			for (const match of matches)
			{
				const url = match[1];
				const start = value.indexOf(url, lastEnd);
				const end = lastEnd = start + url.length;
				urls.push({ url, start, end });
			}
		}
		else urls.push({ url: value, start: 0, end: value.length });
		
		for (const { url, start, end } of urls)
		{
			let name = "";
			let extension = "";
			let width = 0;
			let height = 0;
			let blur = 0;
			let gray = false;
			
			const parts = url.split(imageParamsSplit);
			name = parts[0];
			
			for (const ext of imageExtensions)
				if (name.endsWith(ext))
					extension = ext;
			
			if (parts.length > 1)
			{
				const params = parts[1].split(",").map(s => s.split("=") as [string, string?]);
				for (const [k, v] of params)
				{
					if (k === "width")
						width = Number(v) || 0;
					
					if (k === "height")
						height = Number(v) || 0;
					
					if (k === "blur")
						blur = Number(v) || 0;
					
					if (k === "gray")
						gray = true;
				}
			}
			
			files.push({ name, extension, start, end, width, height, blur, gray });
		}
		
		return files;
	}
	
	/** */
	interface ImageParams
	{
		readonly name: string;
		readonly extension: string;
		readonly start: number;
		readonly end: number;
		readonly width: number;
		readonly height: number;
		readonly blur: number;
		readonly gray: boolean;
	}
	
	const imageParamsSplit = "?";
	const imageExtensions = [".gif", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".svg"];
	
	/**
	 * Finds image files in the specified search root and below,
	 * with the specified extensionless name.
	 */
	async function findImage(searchRoot: Fila, nameMaybeExtensionless: string)
	{
		const queue = await searchRoot.readDirectory();
		const hasExtension = imageExtensions.some(e => nameMaybeExtensionless.endsWith(e));
		
		// If "base" has a slash in it, then it's treated assumed to be an absolute path.
		if (nameMaybeExtensionless.includes("/"))
		{
			if (hasExtension)
			{
				const fila = searchRoot.down(nameMaybeExtensionless);
				if (await fila.exists())
					return fila;
			}
			else for (const fila of imageExtensions.map(e => searchRoot.down(nameMaybeExtensionless)))
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
				if (fila.name === nameMaybeExtensionless)
					return fila;
			}
			else if (imageExtensions.map(e => nameMaybeExtensionless + e).some(s => s === fila.name))
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
}
