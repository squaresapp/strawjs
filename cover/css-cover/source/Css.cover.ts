
namespace Cover
{
	/** */
	export async function coverCss()
	{
		const straw = new Straw.Site();
		
		straw.page("/",
			raw.div(
				raw.css(
					">IMG", {
						border: "10px solid red",
						backgroundImage: `url(sample-photo)`
					}
				)
			)
		);
		
		await straw.emit("cover/css-cover");
		console.log("Done");
	}
}
