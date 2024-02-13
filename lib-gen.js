
/**
 * This is a tool to merge all the library files from the current directory
 * into a single file, which can be executed as a JavaScript file into order
 * to produce an array of files.
 */

const fs = require("node:fs");
const buildDir = process.cwd() + "/build/";
const libDir = buildDir + "lib/";
const contents = fs.readdirSync(libDir);
const varName = "lib";
const text = [`const ${varName} = [`];

//for (const fileName of contents)
for (let i = -1; ++i < Math.min(contents.length);)
{
	const fileName = contents[i];
	if (fileName.endsWith(".ts"))
	{
		console.log(fileName);
		const fileContents = fs.readFileSync(libDir + fileName, "utf8")
			.replace(/`/g, "")
			.replace(/\$/g, "\\$");
		
		text.push('["' + fileName + '", `' + fileContents + "`],");
	}
}

// Slice off the last comma character
text[text.length - 1] = text[text.length - 1].slice(0, -1);
text.push("];");
text.push(`typeof module !== "undefined" && (module.exports = ${varName});`);

const merged = text.join("\n");
fs.writeFileSync(buildDir + varName + ".js", merged, "utf8");
