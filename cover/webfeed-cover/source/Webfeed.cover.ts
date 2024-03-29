
namespace Cover
{
	/** */
	export async function coverWebfeed()
	{
		const straw = new Straw.Site();
		
		straw.page("/",
			raw.meta({ name: "a", content: "b" }),
			raw.meta({ name: "a", content: "b" }),
			
			raw.link({ rel: "a", href: "b" }),
			raw.link({ rel: "a", href: "b" }),
			
			straw.script(() =>
			{
				
			}),
			"This is text that will be inserted into the document directly",
			
			raw.div(
				"class-1 class-2",
				raw.img("img-cls", { src: "sample-photo?w=300" }),
				raw.img("img-cls", { src: "sample-photo" }),
				raw.div(
					"div-img",
					{
						backgroundImage: `url(sample-background)`
					},
					raw.css(":hover", {
						background: "red"
					})
				),
				raw.a("anchor", { href: "/privacy" }),
			)
		);
		
		straw.page("/privacy",
			raw.h1(raw.text("Privacy Policy"))
		);
		
		straw.page("/webfeed/post1", new Date(2023, 0, 1),
			raw.section(),
			raw.section(),
			raw.section(),
		);
		
		straw.page("/webfeed/post2", new Date(2023, 0, 1),
			raw.section(),
			raw.section(),
			raw.section(),
		);
		
		straw.feed({
			author: "Paul Gordon",
			description: "Description",
			root: "/webfeed/",
			icon: "sample-icon.png",
		});
		
		await straw.emit("cover/webfeed-cover");
		console.log("Done");
	}
}

//@ts-ignore
typeof module !== "undefined" && Object.assign(module.exports, { Cover });
