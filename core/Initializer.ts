
namespace Straw
{
	const cp = require("child_process") as typeof import("child_process");
	const readline = require("readline") as typeof import("readline");
	
	/** */
	export interface InitOptions
	{
		path?: string;
		hostname: string;
	}
	
	/**
	 * Initializes a straw website with the necessary packages installed
	 * and the default directories required.
	 */
	export async function init(options: InitOptions)
	{
		const path = options.path || "";
		const initRoot = Fila.new(process.cwd()).down(path);
		const siteName = options.hostname.toLowerCase().replace(/\./g, "-");
		
		const packageJson = {
			name: siteName,
			version: "1.0.0",
			scripts: {
				serve: `cd ${ProjectFolder.site} && npx vite --no-cors`,
				build: `npm install && tsc && node ./${siteName}.js`,
			}
		};
		
		const packageJsonText = JSON.stringify(packageJson, null, "\t");
		await initRoot.down("package.json").writeText(packageJsonText);
		
		const tsconfig = {
			compilerOptions: {
				outFile: siteName + ".js",
				module: "system",
				moduleResolution: "node",
				target: "esnext",
				inlineSourceMap: true,
				inlineSources: true,
				declaration: true,
				declarationMap: true,
				incremental: true,
				jsx: "react",
				jsxFactory: "raw.jsx",
				lib: ["dom", "esnext"]
			},
			include: [ProjectFolder.source + "**/*.ts"]
		}
		
		const tsconfigJsonText = JSON.stringify(tsconfig, null, "\t");
		await initRoot.down("tsconfig.json").writeText(tsconfigJsonText);
		
		const codeWorkspace = {
			folders: [{ path: "." }],
			settings: {
				"files.exclude": {
					"**/.git": true,
					"**/.DS_Store": true,
					"**/node_modules": true,
					"**/package-lock.json": true,
					[siteName + ".*"]: true,
				},
				"search.exclude": {
					"**/.git": true,
					"**/.DS_Store": true,
					"**/node_modules": true,
					"**/package-lock.json": true,
					[siteName + ".*"]: true,
				},
				"task.allowAutomaticTasks": "on",
			},
			launch: {
				configurations: [
					{
						name: "Debug & Build",
						type: "node",
						request: "launch",
						cwd: "${workspaceFolder}",
						program: "${workspaceFolder}/" + siteName + ".js",
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
		};
		
		const codeWorkspaceJsonText = JSON.stringify(codeWorkspace, null, "\t");
		await initRoot.down(siteName + ".code-workspace").writeText(codeWorkspaceJsonText);
		
		await initRoot
			.down(ProjectFolder.source)
			.down("Home.ts")
			.writeText("\n// TODO: Create your home page in this TypeScript file.\n\n");
		
		const includesVite = cp.execSync("npm list -g vite").toString("utf8").includes("vite@");
		if (!includesVite)
			cp.execSync("npm install vite -g");
		
		cp.execSync("npm install @squaresapp/rawjs");
		cp.execSync("npm install strawjs");
		cp.execSync("npm install @types/node --save-dev");
		cp.execSync("npm install typescript --save-dev");
		
		await Promise.all([
			initRoot.down(ProjectFolder.site).writeDirectory(),
			initRoot.down(ProjectFolder.source).writeDirectory(),
			initRoot.down(ProjectFolder.static).writeDirectory(),
		]);
	}
	
	setTimeout(async () =>
	{
		if (require.main === module && process.argv.includes("init"))
		{
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
			
			const hostname = await new Promise<string>(r =>
			{
				rl.question("What is the host name of the site? (example: www.example.com)\n", r);
			});
			
			console.log("Creating...");
			await init({ hostname });
			console.log("Site created. Now open the generated .code-workspace file.");
			process.exit(0);
		}
	});
}
