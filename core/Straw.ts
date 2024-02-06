
declare namespace JSX
{
	/** */
	interface IntrinsicElements
	{
		html: E<HtmlElementAttribute>;
		icon: E<IconElementAttribute>;
		feed: E<FeedElementAttribute>;
	}
	
	/** */
	interface HtmlElementAttribute extends Raw.ElementAttribute
	{
		path: string;
		date: string;
	}
	
	/** */
	interface IconElementAttribute
	{
		src: string;
	}
	
	/** */
	interface FeedElementAttribute
	{
		/**
		 * Stores the root directory of the webfeed, where the index.txt file
		 * is located, and where to look to capture all nested webfeed posts.
		 * Specify a path that is relative to the working directory. If omitted,
		 * the path that is used is the working directory.
		 */
		include: string;
	}
}

namespace Straw
{
	/**
	 * Define a custom JSX element.
	 */
	export function define<K extends keyof JSX.IntrinsicElements>(
		tag: K,
		fn: (
			properties: Partial<Raw.ElementAttribute & (JSX.IntrinsicElements[K] extends JSX.E<infer T> ? T : never)>,
			params: Raw.Param[]) => Element[] | Element | void): void;
	/**
	 * Define meta data on a custom JSX element
	 */
	export function define<K extends keyof JSX.IntrinsicElements>(
		tag: K,
		meta: IJSXElementDesignerData): void
	/** */
	export function define<K extends keyof JSX.IntrinsicElements>(tag: K, param: any)
	{
		if (typeof param === "function")
			defines.set(tag, param);
		else
			metas.set(tag, param);
	}
	
	const defines = new Map<keyof JSX.IntrinsicElements, (properties: any, params: Raw.Param[]) => Element>();
	const metas = new Map<keyof JSX.IntrinsicElements, IJSXElementDesignerData>();
	
	/** */
	export interface IJSXElementDesignerData
	{
		description?: string;
		has?: keyof JSX.IntrinsicElements | (keyof JSX.IntrinsicElements)[],
		markup?: boolean;
	}
	
	/** */
	export function jsx(
		tag: keyof JSX.IntrinsicElements,
		properties: Record<string, any> | null, ...params: Raw.Param[])
	{
		if (tag === "html")
			return void pageCaptureCallback?.(params);
		
		const fn = defines.get(tag);
		if (fn)
		{
			// Generated class names should be appended
			// as class names rather than text content.
			const reg = new RegExp("^" + Raw.GeneratedClassPrefix.value + "[a-z\\d]{9,11}$");
			
			params = params
				.filter(p => p)
				.map(p => typeof p === "string" && !reg.test(p) ? raw.text(p) : p);
			
			return fn(properties || {}, params);
		}
		
		return raw.jsx(tag, properties, ...params);
	}
	
	/**
	 * @internal
	 * Sets the function to call when a JSX <html> tag is encountered
	 */
	export function setPageCaptureCallback(fn?: (params: Raw.Param[]) => void)
	{
		pageCaptureCallback = fn || null;
	}
	let pageCaptureCallback: ((params: Raw.Param[]) => void) | null = null;
	
	//# Custom StrawJS Elements
	
	/** */
	function createElement(
		tagName: string,
		properties: Record<string, any>,
		params: Raw.Param[])
	{
		const e = document.createElement(tagName);
		
		for (const [k, v] of Object.entries(properties))
			e.setAttribute(k, v);
		
		return raw.get(e)(params);
	}
	
	Straw.define("icon", (properties, params) =>
	{
		if (!properties.src)
			return;
		
		if (properties.src.includes("?"))
			throw new Error("Icon files cannot contain image processing parameters.");
		
		return createElement("icon", properties, params);
	});
	
	Straw.define("feed", (properties, params) =>
	{
		return createElement("feed", properties, params);	
	});
}

