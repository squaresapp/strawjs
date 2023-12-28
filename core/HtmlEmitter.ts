
namespace Straw
{
	/** */
	export interface IEmitOptions
	{
		/** */
		rawType: typeof Raw;
		
		/** Specifies whether the <!DOCTYPE> declaration should be included. */
		doctype?: boolean;
		
		/** Specifies whether whitespace should be stripped from the output. */
		minify?: boolean;
		
		/** Specifies whether the output should be formatted as valid XML. */
		xml?: boolean;
		
		/** */
		nodes: Node[];
	}
	
	/** */
	export class HtmlElementEmitter
	{
		/** */
		constructor(readonly options: IEmitOptions)
		{
			this.em = new HtmlEmitter(options);
			this.rawType = options.rawType;
			
			if (options.doctype === undefined)
				options.doctype = true;
		}
		
		private readonly em;
		private readonly rawType;
		
		/** */
		emit()
		{
			if (this.options.doctype)
				this.em.line("<!DOCTYPE html>");
			
			for (const n of this.options.nodes)
			{
				if (this.rawType.is.element(n))
					this.emitElement(n);
				
				else if (this.rawType.is.comment(n))
					this.emitComment(n);
				
				else if (this.rawType.is.node(n))
					this.emitNode(n);
			}
			
			return this.toString();
		}
		
		/** */
		private emitElement(e: HTMLElement)
		{
			const attributes = this.getAttributes(e);
			const name = e.nodeName.toLowerCase();
			
			if (name === "head" || name === "body" && e.childNodes.length === 0)
				return;
			
			if (isIsland(name) || e.childNodes.length === 0)
			{
				this.em.tag(name, attributes, e.nodeValue || "");
			}
			// The <pre> element needs to be special cased
			// because of specific formatting requirements.
			else if (name === "pre")
			{
				this.em.open(name, attributes);
				const inlineHtml = this.recurseInline(e);
				this.em.inline(inlineHtml);
				this.em.close(name);
			}
			else if (isInline(name))
			{
				const em = new HtmlEmitter(this.em.options);
				em.openInline(name, attributes);
				em.inline(this.recurseInline(e));
				em.closeInline(name);
				this.em.line(em.toString());
			}
			else if (this.hasOnlyInline(e))
			{
				const inlineHtml = this.recurseInline(e);
				
				if (inlineHtml.length > 80)
				{
					this.em.open(name, attributes);
					this.em.indent();
					this.em.line(inlineHtml);
					this.em.outdent();
					this.em.close(name);
				}
				else
				{
					const em = new HtmlEmitter(this.em.options);
					em.openInline(name, attributes);
					em.inline(inlineHtml);
					em.closeInline(name);
					this.em.line(em.toString());
				}
			}
			else
			{
				this.em.open(name, attributes);
				
				if (name !== "body")
					this.em.indent();
				
				for (const child of Array.from(e.childNodes))
				{
					if (this.rawType.is.text(child) && child.nodeValue)
					{
						const linesOfText = child.nodeValue
							.split(/\n/g)
							.map(s => s.trim().replace(/\s+/g, " "));
						
						for (const lineOfText of linesOfText)
							this.em.line(lineOfText);
					}
					else if (this.rawType.is.element(child))
					{
						this.emitElement(child);
					}
				}
				
				if (name !== "body")
					this.em.outdent();
				
				this.em.close(name);
			}
		}
		
		/** */
		private recurseInline(e: HTMLElement)
		{
			const em = new HtmlEmitter(this.options);
			
			const recurse = (nodes: Iterable<Node>) =>
			{
				for (const child of Array.from(nodes))
				{
					if (this.rawType.is.text(child) && child.nodeValue)
					{
						em.inline(child.nodeValue);
					}
					else if (this.rawType.is.element(child))
					{
						const attributes = this.getAttributes(child);
						const name = child.nodeName.toLowerCase();
						em.openInline(name, attributes);
						
						if (!isIsland(child.nodeName))
						{
							recurse(Array.from(child.childNodes));
							em.closeInline(name);
						}
					}
				}
			};
			
			recurse(Array.from(e.childNodes));
			return em.toString();
		}
		
		/** */
		private hasOnlyInline(e: HTMLElement)
		{
			const nodes = Array.from(e.childNodes);
			
			if (nodes.length === 0)
				return false;
			
			return nodes
				.map(n => this.rawType.is.text(n) || (this.rawType.is.element(n) && isInline(n.nodeName)))
				.every(bool => bool);
		}
		
		/** */
		private getAttributes(e: HTMLElement)
		{
			const attributesTable: Record<string, string | number> = {};
			
			for (let i = -1; ++i < e.attributes.length;)
			{
				const attribute = e.attributes[i];
				
				// Special-case an empty class attribute
				// This thing can get added erroneously by
				// the browser it seems.
				if (attribute.name === "class" && !attribute.value)
					continue;
				
				attributesTable[attribute.name] = attribute.value;
			}
			
			return attributesTable;
		}
		
		/** */
		private emitComment(node: Raw.INodeLike)
		{
			this.em.line("<!--" + (node.nodeValue || "") + "-->");
		}
		
		/** */
		private emitNode(node: Raw.INodeLike)
		{
			this.em.inline(node.nodeValue || "");
		}
		
		/** */
		private toString()
		{
			return this.em.toString();
		}
	}
	
	/** */
	class HtmlEmitter extends Emitter
	{
		/** */
		constructor(readonly options: IEmitOptions)
		{
			super(options.minify);
		}
		
		/** */
		open(tag: string, attributes: Record<string, string | number> = {})
		{
			this.line(this.tagStart(tag, attributes) + ">");
		}
		
		/** */
		openInline(tag: string, attributes: Record<string, string | number> = {})
		{
			this.inline(this.tagStart(tag, attributes) + ">");
		}
		
		/** */
		close(tag: string)
		{
			this.line("</" + tag + ">");
		}
		
		/** */
		closeInline(tag: string)
		{
			this.inline("</" + tag + ">");
		}
		
		/** */
		tag(
			tagName: string,
			attributes: Record<string, string | number> = {},
			innerText = "")
		{
			let text = this.tagStart(tagName, attributes);
			
			if (isIsland(tagName))
				text += this.options.xml ? "/>" : ">"
			else
				text += ">" + innerText + "</" + tagName + ">";
			
			this.line(text);
		}
		
		/** */
		tagStart(tagName: string, attributes: Record<string, string | number>)
		{
			let text = "<" + tagName;
			
			for (const [key, value] of Object.entries(attributes))
			{
				if (value === "")
					text += " " + key;
				
				else if (!value)
					continue;
				
				else if (typeof value === "string" && value.includes(`"`))
					text += ` ${key}='${value}'`;
				
				else
					text += ` ${key}="${value}"`;
			}
			
			return text;
		}
		
		/** */
		hasCloseTag(tag: string)
		{
			return !["meta", "link", "br", "img", ].includes(tag);
		}
	}
	
	/** */
	export function isInline(tag: string)
	{
		return inlineTags.has(tag.toUpperCase());
	}
	
	/** */
	export function isIsland(tag: string)
	{
		return islandTags.has(tag.toUpperCase());
	}
	
	const inlineTags = new Set([
		"A",
		"ABBR",
		"ACRYONYM",
		"B",
		"BDI",
		"BDO",
		"BIG",
		"BR",
		"CITE",
		"CODE",
		"DATA",
		"DEL",
		"DFN",
		"EM",
		"I",
		"IMG",
		"INS",
		"KBD",
		"MARK",
		"Q",
		"RUBY",
		"S",
		"SAMP",
		"SMALL",
		"SPAN",
		"STRONG",
		"SUB",
		"SUP",
		"TT",
		"U",
		"VAR",
		"WBR",
	]);
	
	const islandTags = new Set([
		"META",
		"LINK",
		"BASE",
		"IMG",
		"BR"
	]);
}
