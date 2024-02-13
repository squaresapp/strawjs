
namespace Straw
{
	/** */
	export interface InitOptions
	{
		name?: string;
		path: string;
	}
	
	/**
	 * Creates a website project with all the default folders and files necessary
	 * to run StrawJS.
	 */
	export async function setupProject(options: InitOptions)
	{
		const rootFila = new Fila(options.path);
		const sourceFila = rootFila.down(ProjectFolder.source);
		const siteFila = rootFila.down(ProjectFolder.site);
		const staticFila = rootFila.down(ProjectFolder.static);
		const supportFila = rootFila.down(ProjectFolder.support);
		const name = options.name || "Site";
		
		await Promise.all([
			siteFila.writeDirectory(),
			sourceFila.writeDirectory(),
			staticFila.writeDirectory(),
			supportFila.writeDirectory(),
		]);
		
		await Promise.all([
			rootFila.down(".editorconfig").writeText(getEditorConfigContent()),
			rootFila.down("package.json").writeText(getPackageJsonContent()),
			rootFila.down(name + ".code-workspace").writeText(getCodeWorkspaceContent()),
			rootFila.down("tsconfig.json").writeText(getTsConfigJsonContent()),
			sourceFila.down("start.ts").writeText(getStartTsContent()),
		]);
	}
	
	/**
	 * Runs a series of command line operations in order to make the
	 * project runnable from Node.js. This method assumes that a project
	 * folder has already been created, such as from calling Straw.setupProject().
	 */
	export function setupProjectForNodeJs()
	{
		if (!NODE)
			return;
		
		let includesVite = false;
		const cp = require("child_process") as typeof import("child_process");
		
		try
		{
			includesVite = cp.execSync("npm list -g vite").toString("utf8").includes("vite@");
		}
		catch (e) { }
		
		if (!includesVite)
			cp.execSync("npm install vite -g");
		
		cp.execSync("npm install @squaresapp/rawjs");
		cp.execSync("npm install strawjs");
		cp.execSync("npm install @types/node --save-dev");
		cp.execSync("npm install typescript --save-dev");
	}
	
	const typescriptOutFile = ProjectFolder.support + "site.js";
	
	/** */
	function getTsConfigJsonContent()
	{
		return json({
			"compilerOptions": {
				"outFile": typescriptOutFile,
				"composite": true,
				"module": "system",
				"moduleResolution": "node",
				"target": "esnext",
				"inlineSourceMap": true,
				"inlineSources": true,
				"strict": true,
				"baseUrl": "./",
				"rootDir": ".",
				"declaration": true,
				"declarationMap": true,
				"stripInternal": true,
				"incremental": true,
				"preserveConstEnums": true,
				"jsx": "react",
				"jsxFactory": "straw.jsx",
				"lib": [
					"dom",
					"esnext",
					"esnext.array",
					"esnext.asynciterable"
				]
			},
			"include": [
				"support/raw.d.ts",
				"support/straw.d.ts",
				"source/**/*.ts",
				"source/**/*.tsx"
			]
		});
	}
	
	/** */
	function getCodeWorkspaceContent()
	{
		return json({
			folders: [{ path: "." }],
			settings: {
				"files.exclude": {
					"**/.git": true,
					"**/.DS_Store": true,
					"**/node_modules": true,
					"**/package-lock.json": true,
				},
				"search.exclude": {
					"**/.git": true,
					"**/.DS_Store": true,
					"**/node_modules": true,
					"**/package-lock.json": true,
					[ProjectFolder.site + "/**/*.*"]: true,
					[ProjectFolder.support + "/**/*.*"]: true,
				},
				"task.allowAutomaticTasks": "on",
			},
			launch: {
				configurations: [
					{
						name: "Debug + Emit",
						type: "node",
						request: "launch",
						cwd: "${workspaceFolder}",
						program: "${workspaceFolder}/" + typescriptOutFile,
						sourceMaps: true
					}
				]
			},
			tasks: {
				version: "2.0.0",
				tasks: [{
					label: "Compile Site",
					type: "shell",
					command: "tsc",
					args: ["--build", "--watch"],
					options: { cwd: "${workspaceRoot}" },
					problemMatcher: ["$tsc"],
					runOptions: { runOn: "folderOpen" },
					group: { kind: "build", isDefault: true },
					isBackground: true
				}]
			}
		});
	}
	
	/** */
	function getEditorConfigContent()
	{
		return lines(
			`[*]`,
			`indent_style = tab`,
			`indent_size = 2`,
			`end_of_line = lf`,
			`insert_final_newline = true`,
			`trim_trailing_whitespace = false`,
		);
	}
	
	/** */
	function getPackageJsonContent()
	{
		return json(
			{
				scripts: {
					serve: `cd ${ProjectFolder.site} && npx vite --no-cors`,
					emit: "node ./support/site.js"
				},
				dependencies: {
					strawjs: "^1.2.1"
				}
			}
		);
	}
	
	/** */
	function getStartTsContent()
	{
		return lines(
			`declare const straw: Straw.Program;`,
			`typeof straw === "undefined" && ((global as any).straw = require("strawjs")()).compile();`
		);
	}
	
	const lines = (...strings: string[]) => strings.join("\n");
	const json = (json: any) => JSON.stringify(json, null, "\t");
	
	NODE && setTimeout(async () =>
	{
		if (require.main === module && process.argv.includes("init"))
		{
			const readline = require("readline") as typeof import("readline");
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
			
			const name = await new Promise<string>(r =>
			{
				rl.question(
					"Provide a name for the site:\n" +
					"(No spaces, no dots. Example: www-example-com)\n", r);
			});
			
			console.log("Creating...");
			await Straw.setupProject({ name, path: process.cwd() });
			console.log("Site created. Now open the generated .code-workspace file.");
			process.exit(0);
		}
	});
}
