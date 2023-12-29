
namespace Cover
{
	/** */
	export async function coverIconGeneration()
	{
		const straw = new Straw.Site();
		
		straw.page("/",
			straw.icon("sample-icon"),
		);
		
		await straw.emit("cover/icon-cover");
		console.log("Done");
	}
}
