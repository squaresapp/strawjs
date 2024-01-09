
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
	
	/** */
	export async function coverJsx()
	{
		const straw = new Straw.Site();
		straw.page("/", <div class="class names here">Text content</div>);
		await straw.emit("cover/static-cover");
		console.log("Done");
	}
	
	/** */
	export async function coverStaticFile()
	{
		const straw = new Straw.Site();
		
		straw.file("/should-be-a-file",
			"This is should be plain text within the file."
		);
		
		await straw.emit("cover/static-cover");
		console.log("Done");
	}
}
