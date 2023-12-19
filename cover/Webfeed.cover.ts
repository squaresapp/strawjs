
namespace Cover
{
	/** */
	export async function coverBasic()
	{
		straw.page("/",
			straw.script(() =>
			{
				
			}),
			"This is text that will be inserted into the document directly",
			
			raw.div(
				"class-1 class-2",
				raw.img("img-cls", { src: "img.example?width=300" }),
				raw.img("img-cls", { src: "img.twitter" }),
				raw.div(
					"div-img",
					{
						backgroundImage: `url(img.button-apple-store)`
					}
				),
				raw.a("anchor", { href: "/privacy" }),
			)
		);
		
		straw.page("/privacy",
			raw.h1(raw.text("Privacy Policy"))
		);
		
		straw.post("/webfeed/post1", new Date(2023, 0, 1),
			raw.section(),
			raw.section(),
			raw.section(),
		);
		
		straw.post("/webfeed/post2", new Date(2023, 0, 1),
			raw.section(),
			raw.section(),
			raw.section(),
		);
		
		straw.feed({
			author: "Paul Gordon",
			description: "Description",
			root: "/webfeed/",
			icon: "icon",
		});
		
		setTimeout(() => straw.emit());
	}
}

//@ts-ignore
typeof module !== "undefined" && Object.assign(module.exports, { Cover });
