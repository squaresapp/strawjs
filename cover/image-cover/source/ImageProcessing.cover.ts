
namespace Cover
{
	/** */
	export async function coverImageProcessing()
	{
		const straw = new Straw.Site();
		
		straw.page("/",
			raw.img({ src: "sample-photo?crop=100,100,500,500,sat=-100" }),
			raw.img({ src: "sample-photo?w=200,crop=250,0,500,667" }),
		);
		
		await straw.emit("cover/image-cover");
		console.log("Done");
	}
}
