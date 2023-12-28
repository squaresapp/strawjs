
namespace Cover
{
	/** */
	export async function coverStatic()
	{
		const straw = new Straw.Site();
		
		straw.page("/",
			raw.link({ rel: "stylesheet", href: "/static/style.css" })
		);
		
		await straw.emit("cover/static-cover");
		console.log("Done");
	}
}
