
namespace Cover
{
	/** */
	export async function coverCss()
	{
		const straw = new Straw.Site();
		
		const css = raw.css(
			">IMG", {
				border: "10px solid red"
			}
		);
		
		const div = raw.div(css);
		
		straw.page("/",
			div
		);
		
		await straw.emit("cover/css-cover");
	}
}
