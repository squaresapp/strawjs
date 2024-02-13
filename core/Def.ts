
namespace Straw
{
	/**
	 * An enumeration that stores the well-known folders
	 * within Straw.
	 */
	export const enum SiteFolder
	{
		resources = "/resources/",
		icons = "/resources/icon/",
		images = "/resources/images/",
		fonts = "/resources/fonts/",
	}
	
	/**
	 * 
	 */
	export const enum ProjectFolder
	{
		site = "site/",
		source = "source/",
		static = "static/",
		support = "support/",
	}
	
	/**
	 * An object that stores the various icon size variations to generate 
	 * for individual targets.
	 */
	export const iconSizes = {
		generic: [16, 32, 96, 192],
		appleTouch: [57, 60, 72, 76, 114, 120, 144, 152, 180],
	};
	
	/**
	 * Defines the prefix to place on a file name in order to have it
	 * copied from the source folder into the same location within
	 * the site folder.
	 */
	export const copyPrefix = "^";
	
	/**
	 * @internal
	 * Stores the name of the TSX files that get converted into
	 * HTML files.
	 */
	export const indexFileName = "index.tsx"
	
	/** @internal */
	export type TLocationTranslatorFn = (characterIndex: number) => number;
	
	/** @internal */
	export type SourceFile = import("typescript").SourceFile;
	
	/** @internal */
	export type TsNode = import("typescript").Node;
	
	/** @internal */
	export type TsJsxElementNode = import("typescript").JsxElement;
	
	/** @internal */
	export type TsJsxSelfClosingElementNode = import("typescript").JsxSelfClosingElement;
	
	/** @internal */
	export type CompilerOptions = import("typescript").CompilerOptions;
	
	/** @internal */
	export type CompilerHost = import("typescript").CompilerHost;
	
	/** @internal */
	export type VirtualTypeScriptEnvironment = import("@typescript/vfs").VirtualTypeScriptEnvironment;
	
	/**
	 * A mapped type that can be used to extract the attributes from a custom JSX element.
	 */
	export type JsxElementAttributesOf<K extends keyof JSX.IntrinsicElements> = 
		Partial<Raw.ElementAttribute & (JSX.IntrinsicElements[K] extends JSX.E<infer T> ? T : never)>;
	
	/**
	 * 
	 */
	export interface JsxElementDesignerData
	{
		readonly description: string;
		readonly has: keyof JSX.IntrinsicElements | (keyof JSX.IntrinsicElements)[],
		readonly markup: boolean;
	}
	
	/**
	 * 
	 */
	export interface JsxElementDefinition extends JsxElementDesignerData
	{
		readonly renderFn: JsxRenderFunction<any>;
	}
	
	/**
	 * 
	 */
	export interface JsxElement
	{
		readonly definition: JsxElementDefinition;
		
		/**
		 * @internal
		 * A reference to the TypeScript AST node
		 * The type of this node is either a JsxElement or a JsxSelfClosingElement.
		 */
		readonly typescriptNode: TsNode;
	}
	
	/** */
	export type JsxRenderFunction<K extends keyof JSX.IntrinsicElements> = 
		(properties: JsxElementAttributesOf<K>, params: Raw.Param[]) => Element[] | Element | void;
	
}

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
