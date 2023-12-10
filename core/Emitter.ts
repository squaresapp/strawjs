
namespace Straw
{
	/** @internal */
	export class Emitter
	{
		/** */
		constructor(minify = false)
		{
			this.indentChar = minify ? "" : "\t";
			this.lineChar = minify ? "" : "\n";
			this.space = minify ? "" : " ";
		}
		
		private readonly indentChar: string;
		private readonly lineChar: string;
		private readonly strings: string[] = [];
		
		/** Gets the space character, or empty if the emitter is operating in minified mode. */
		readonly space: string;
		
		/** */
		line(text = "")
		{
			this.strings.push(this.getIndent());
			
			if (text !== "")
				this.strings.push(text);
			
			this.strings.push(this.lineChar);
		}
		
		/** */
		inline(text = "")
		{
			if (text !== "")
				this.strings.push(text);
		}
		
		/** */
		lines(...lines: string[])
		{
			for (const line of lines)
				this.line(line);
		}
		
		/** */
		indent()
		{
			this.currentIndent++;
		}
		
		/** */
		outdent()
		{
			this.currentIndent--;
		}
		
		/** */
		private getIndent()
		{
			return this.indentChar.repeat(this.currentIndent);
		}
		
		private currentIndent = 0;
		
		/** */
		toString()
		{
			return this.strings.join("");
		}
	}
}
