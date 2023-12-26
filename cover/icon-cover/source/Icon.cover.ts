
namespace Cover
{
	/** */
	export async function coverIconGeneration()
	{
		straw.page("/", 
			straw.icon("sample-icon.png")
		);
		
		await straw.emit("cover/icon-cover");
		console.log("Done");
	}
}
