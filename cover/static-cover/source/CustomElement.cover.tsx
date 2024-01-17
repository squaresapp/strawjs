
declare namespace JSX
{
	interface IntrinsicElements
	{
		loud: E<LoudElementAttribute>;
	}
}

interface LoudElementAttribute extends Raw.ElementAttribute
{
	size: number;
	width: number;
	text: string;
	on: boolean;
	obj: Record<string, number>;
	nums: number[];
}

namespace Cover
{
	/** */
	export async function coverCustomJSXElement()
	{
		const straw = new Straw.Site();
		
		window.customElements.define("loud", class extends HTMLElement
		{
			readonly localName = "div";
			
			get size() { return parseInt(this.style.fontSize); }
			set size(value: number) { this.style.fontSize = value + "em" }
			
			get width() { return parseInt(this.style.maxWidth); }
			set width(value: number) { this.style.maxWidth = value + "em" }
		});
		
		let e: any;
		
		straw.page("/", 
			e = <loud obj={{ a: 1 }} size={1} width={3} text="txt" on={true} nums={[1, 2]}>A <b>B</b> C</loud>
		);
		
		await straw.emit("cover/static-cover");
		console.log("Done");
	}
}


