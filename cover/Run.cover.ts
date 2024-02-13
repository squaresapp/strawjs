
namespace Cover
{
	/** */
	export async function coverStraw()
	{
		const directory = process.cwd() + "/sample-site/";
		const straw = new Straw.Program(directory);
		await straw.compile();
		
		for (const [, page] of straw.pages)
		{
			console.log(page.documentElement.outerHTML);
			console.log("");
		}
		
		const inspector = await Straw.JsxElementInspector.new(straw.directories.support);
		inspector.inspect("red");
		
		const jsxDefinitions = await straw.getDefinedJsxElementTypeInfo();
	}
	
	/** */
	export async function coverLocationTranslator()
	{
		const tsCode = `<html>
	<meta name="author" content="Squares, Inc" />
	<meta name="description" content="StrawJS Example Feed" />
	<icon src="sample-icon" />
	<feed include="/page-*/**" />
</html>`;
		
		const jsCode = `___jsx___xxxxx("html", null,
    ___jsx___xxxxx("meta", { name: "author", content: "Squares, Inc" }),
    ___jsx___xxxxx("meta", { name: "description", content: "StrawJS Example Feed" }),
    ___jsx___xxxxx("icon", { src: "sample-icon" }),
    ___jsx___xxxxx("feed", { include: "/page-*/**" }));
/` + `/# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kdWxlLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtJQUNDLHlCQUFNLElBQUksRUFBQyxRQUFRLEVBQUMsT0FBTyxFQUFDLGNBQWMsR0FBRztJQUM3Qyx5QkFBTSxJQUFJLEVBQUMsYUFBYSxFQUFDLE9BQU8sRUFBQyxzQkFBc0IsR0FBRztJQUMxRCx5QkFBTSxHQUFHLEVBQUMsYUFBYSxHQUFHO0lBQzFCLHlCQUFNLE9BQU8sRUFBQyxZQUFZLEdBQUcsQ0FDdkIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIjxodG1sPlxuXHQ8bWV0YSBuYW1lPVwiYXV0aG9yXCIgY29udGVudD1cIlNxdWFyZXMsIEluY1wiIC8+XG5cdDxtZXRhIG5hbWU9XCJkZXNjcmlwdGlvblwiIGNvbnRlbnQ9XCJTdHJhd0pTIEV4YW1wbGUgRmVlZFwiIC8+XG5cdDxpY29uIHNyYz1cInNhbXBsZS1pY29uXCIgLz5cblx0PGZlZWQgaW5jbHVkZT1cIi9wYWdlLSovKipcIiAvPlxuPC9odG1sPiJdfQ==`;
		
		const fn = Straw.createLocationTranslator(jsCode);
		const idx = jsCode.indexOf(`jsx___xxxxx("icon", { src: "sample-icon" })`);
		const tsPos = fn(idx);
		console.log(tsPos);
	}
	
	Object.assign(module.exports, { Cover });
}
