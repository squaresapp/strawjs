
namespace Cover
{
	/** */
	export async function coverCss()
	{
		const straw = new Straw.Site();
		
		straw.page("/page-1",
			raw.div(
				raw.css(
					"&", {
						width: 0,
					},
					">IMG", {
						border: "10px solid red",
						backgroundImage: `url(sample-photo)`
					}
				)
			)
		);
		
		straw.page("/page-2",
			raw.div(
				raw.css(
					">DIV", {
						backgroundImage: `linear-gradient(blue, red)`
					}
				)
			)
		);
		
		await straw.emit("cover/css-cover");
		console.log("Done");
	}
}
