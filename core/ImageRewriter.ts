
namespace Straw
{
	/**
	 * @internal
	 */
	export class ImageRewriter
	{
		/** */
		constructor(root: Fila)
		{
			this.imageSearchRoot = root.down(ProjectFolder.source);
			this.imagesSaveRoot = root.down(ProjectFolder.site).down(SiteFolder.images);
			this.iconsSaveRoot = root.down(ProjectFolder.site).down(SiteFolder.icons);
		}
		
		private readonly imageSearchRoot: Fila;
		private readonly imagesSaveRoot: Fila;
		private readonly iconsSaveRoot: Fila;
		
		/**
		 * Scans the specified top-level HTML elements, and their nested elements,
		 * for elements that have attributes and styles that reference external image files.
		 * These images are extracted and copied to the output location, and the
		 * attribute and style values are replaced with new values that reference the
		 * image in the output location.
		 * 
		 * The function also deals with image processing. Non-SVG Image URLs can
		 * have parameters such as w= and h=, which are processed by Photon.
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
						const imageFila = await ImageProcessor.findImage(this.imageSearchRoot, params.name);
						if (!imageFila)
							throw new Error("No image found with name: " + params.name);
						
						const dstFileName = await ImageProcessor.processImage(
							imageFila,
							this.imagesSaveRoot,
							params);
						
						propertyValue = 
							propertyValue.slice(0, params.start) +
							SiteFolder.images + 
							dstFileName +
							propertyValue.slice(params.end);
					}
					
					x.style.setProperty(x.property, propertyValue);
				}
				else if (x instanceof Attr)
				{
					const params = parseImageUrl(x.value)[0];
					const imageFila = await ImageProcessor.findImage(this.imageSearchRoot, params.name);
					if (!imageFila)
						throw new Error("No image found with name: " + params.name);
					
					// Icons need to be handled separately than normal images.
					const e = x.ownerElement as HTMLLinkElement;
					if (e?.tagName === "LINK" && (e.rel === "icon" || e.rel === "apple-touch-icon"))
					{
						const crop = await ImageProcessor.calculateIconCrop(imageFila);
						if (crop)
							params.crop = crop;
						
						x.value = 
							SiteFolder.icons + 
							await ImageProcessor.processImage(imageFila, this.iconsSaveRoot, params);
					}
					else
					{
						x.value = 
							SiteFolder.images + 
							await ImageProcessor.processImage(imageFila, this.imagesSaveRoot, params);
					}
				}
			}
		}
	}
	
	/**
	 * Scans for HTML attributes and CSS properties that have URLs
	 * in them that refer to external resource files.
	 */
	function scanForImages(within: HTMLElement | HTMLElement[])
	{
		const containers = Array.isArray(within) ? within : [within];
		const result: (Attr | DiscoveredProperty)[] = [];
		
		for (const container of containers)
		{
			for (const e of Util.walkElementTree(container))
			{
				const tag = e.tagName;
				const attributes = [
					e.getAttributeNode("src"),
					tag === "EMBED" && e.getAttributeNode("source"),
					tag === "VIDEO" && e.getAttributeNode("poster"),
					tag === "OBJECT" && e.getAttributeNode("data"),
					tag === "FORM" && e.getAttributeNode("action"),
					tag === "LINK" && 
						(e.getAttribute("rel") ===  "icon" || 
						e.getAttribute("rel") === "shortcut icon" ||
						e.getAttribute("rel") === "apple-touch-icon") && 
						e.getAttributeNode("href"),
				];
				
				if (tag === "STYLE")
				{
					const sheet = (e as HTMLStyleElement).sheet;
					if (sheet)
					{
						for (let i = -1; ++i < sheet.cssRules.length;)
						{
							const rule = sheet.cssRules[i] as CSSStyleRule;
							result.push(...discoverProperties(rule.style));
						}
					}
				}
				else
				{
					for (const attr of attributes)
						if (attr && attr.value)
							if (!reg.test(attr.value))
								result.push(attr);
					
					result.push(...discoverProperties(e.style));
				}
			}
		}
		
		return result;
	}
	
	/** */
	function discoverProperties(style: CSSStyleDeclaration)
	{
		const discovered: DiscoveredProperty[] = [];
		
		for (const property of Straw.cssPropertiesWithUrls)
		{
			const val = style.getPropertyValue(property);
			if (val && !reg.test(val) && val.includes("url("))
				discovered.push(new DiscoveredProperty(style, property, val));
		}
		
		return discovered;
	}
	const reg = /^https?:\/\//;
	
	/** */
	class DiscoveredProperty
	{
		constructor(
			readonly style: CSSStyleDeclaration,
			readonly property: string,
			readonly value: string
		) { }
	}
	
	/**
	 * Parses image urls, in the format image.png?w=10,h=10
	 * The image URL may be encapsulated with in a CSS url() definition,
	 * such as url (image.png?w=10,h=10).
	 * The supplied string may also contain multiple instances of these
	 * image definitions.
	 */
	function parseImageUrl(value: string): ImageParams[]
	{
		const params: ImageParams[] = [];
		const urls: { url: string; start: number, end: number }[] = [];
		const reg = /url\("?([/A-Za-z0-9\.\-\_]+(\?[a-z=&\,\d+]+)?)"?\)/g;
		
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
			let crop: TCrop | null = null;
			let hue = 0;
			let sat = 0;
			let light = 0;
			let blur = 0;
			
			const parts = url.split(imageParamsSplit);
			name = parts[0];
			
			for (const ext of ImageProcessor.extensions)
				if (name.endsWith(ext))
					extension = ext;
			
			if (parts.length > 1)
			{
				const tokens = parts[1].split(/[&,]/g);
				
				for (let i = -1; ++i < tokens.length;)
				{
					const token = tokens[i];
					const k = token.split("=")[0];
					const n = Number(token.slice(k.length + 1)) || 0;
					
					if (k === "crop")
					{
						let x1 = n;
						let y1 = isNumber(tokens[i + 1]) ? Number(tokens[i + 1]) || 0 : 0;
						let x2 = isNumber(tokens[i + 2]) ? Number(tokens[i + 2]) || 0 : 0;
						let y2 = isNumber(tokens[i + 3]) ? Number(tokens[i + 3]) || 0 : 0;
						i += 3;
						
						if (x2 === 0 || y2 === 0 || x2 < x1 || y2 < y1)
							throw new Error("Invalid cropping parameters.");
						
						crop = [x1, y1, x2, y2];
						continue;
					}
					
					if (k === "width" || k === "w")
						width = n;
					
					if (k === "height" || k === "h")
						height = n;
					
					if (k === "hue")
						hue = n;
					
					if (k === "sat")
						sat = n;
					
					if (k === "light")
						light = n;
					
					if (k === "blur")
						blur = n;
				}
			}
			
			params.push({ name, extension, start, end, width, height, crop, hue, sat, light, blur });
		}
		
		return params;
	}
	
	/** */
	function isNumber(s: string)
	{
		const n = parseInt(s);
		return n === n;
	}
	
	const imageParamsSplit = "?";
}
