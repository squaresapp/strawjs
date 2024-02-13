
namespace Straw
{
	/**
	 * @internal
	 */
	export class JsxElementInspector
	{
		/** */
		static async new(supportDirectory: string)
		{
			const virtualFiles = new Map<string, string>(Straw.lib);
			const supportFila = new Fila(supportDirectory);
			
			for (const fila of await supportFila.readDirectory())
				if (fila.extension === ".ts" && !await fila.isDirectory())
					virtualFiles.set(fila.name, await fila.readText());
			
			const compilerOptions: CompilerOptions = {
				target: ts.ScriptTarget.ES2022
			};
			
			const filePaths = Array.from(virtualFiles.keys());
			const system = Straw.tsvfs.createFSBackedSystem(virtualFiles, "/", Straw.ts);
			const env = Straw.tsvfs.createVirtualTypeScriptEnvironment(
				system,
				filePaths,
				Straw.ts,
				compilerOptions);
			
			return new JsxElementInspector(env, virtualFiles);
		}
		
		/** */
		private constructor(
			private readonly env: VirtualTypeScriptEnvironment,
			private readonly virtualFiles: Map<string, string>)
		{ }
		
		/**
		 * 
		 */
		update()
		{
			// Re-load the files in the support folder, and create a new typescript environment.
			// Or possibly we just update any files that have been deleted to be an empty string.
			// This way you wouldn't need to recompile the entire library code.
		}
		
		/**
		 * Returns the names and type signatures of the properties available
		 * on the specified set of user-defined JSX tag names.
		 */
		inspect(...jsxTagNames: string[])
		{
			const charPositions = new Map<string, number>();
			let inspectCode = "[";
			
			for (const name of jsxTagNames)
			{
				inspectCode += `{} as Straw.JsxElementAttributeOf<"${name}">["`;
				charPositions.set(name, inspectCode.length);
				inspectCode += `"],`;
			}
			
			inspectCode += "]";
			this.env.createFile("inspect.ts", inspectCode);
			const svc = this.env.languageService;
			type TAttributeInfo = { attributeName: string, signature: string; };
			const inspectResult: { [tagName: string]: TAttributeInfo[] } = {};
			
			for (const name of jsxTagNames)
			{
				const charPos = charPositions.get(name)!;
				const completions = svc.getCompletionsAtPosition("inspect.ts", charPos, {
					includeSymbol: true
				});
				
				if (!completions)
					continue;
				
				const attributeInfos: TAttributeInfo[] = [];
				
				for (const entry of completions.entries)
				{
					const decls = entry.symbol!.getDeclarations() || [];
					for (const decl of decls)
					{
						const declTyped = decl as import("typescript").PropertySignature;
						const signature = declTyped.type!.getText();
						attributeInfos.push({ attributeName: entry.name, signature });
					}
				}
				
				inspectResult[name] = attributeInfos;
			}
			
			return inspectResult;
		}
	}
}
