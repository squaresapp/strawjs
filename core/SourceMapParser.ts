
namespace Straw
{
	/**
	 * @internal
	 * Returns a function that accepts a numeric character index which represents
	 * a location in the compiled output, and returns the translated range in the
	 * source file.
	 */
	export function createLocationTranslator(jsCompiledCode: string)
	{
		const sourceMap = getSourceMapFromJavaScriptCode(jsCompiledCode);
		if (!sourceMap)
			return () => -1;
		
		const sourceMappings = decode(sourceMap.mappings);
		const charMappings: { tsChar: number, jsChar: number }[] = [];
		
		const createCharIndexArray = (code: string) => code
			.split("\n")
			.map(s => s.length + 1)
			.map((v, i, a) => a.slice(0, i).reduce((v, accum) => v + accum, 0));
		
		const tsLineSums = createCharIndexArray(sourceMap.sourcesContent[0]);
		const jsLineSums = createCharIndexArray(jsCompiledCode);
		
		for (let jsLine = -1; ++jsLine < sourceMappings.length;)
		{
			const sourceMapLine = sourceMappings[jsLine];
			
			for (const sourceMapSegment of sourceMapLine)
			{
				if (sourceMapSegment.length === 1)
					continue;
				
				const tsLine = sourceMapSegment[2];
				const tsCol = sourceMapSegment[3];
				const jsCol = sourceMapSegment[0];
				const tsChar = tsLineSums[tsLine] + tsCol;
				const jsChar = jsLineSums[jsLine] + jsCol;
				charMappings.unshift({ tsChar, jsChar });
			}
		}
		
		return (jsTargetChar: number) =>
		{
			for (const { tsChar, jsChar } of charMappings)
				if (jsChar <= jsTargetChar)
					return tsChar;
			
			return -1;
		};
	}
	
	/**
	 * Extracts an ISourceMap object embedded within the specified
	 * JavaScript code string.
	 */
	function getSourceMapFromJavaScriptCode(jsCompiledCode: string)
	{
		const searchString = "//# sourceMappingURL=data:application/json;base64,";
		const idx = jsCompiledCode.indexOf(searchString) + searchString.length;
		
		if (idx < searchString.length)
			return null;
		
		const base64 = jsCompiledCode.slice(idx);
		const base64Decoded = atob(base64);
		return Util.tryParseJson<ISourceMap>(base64Decoded);
	}
	
	/**
	 * Defines the JSON object shape of embedded source maps.
	 */
	interface ISourceMap
	{
		readonly version: number;
		readonly file: string;
		readonly sourceRoot: string;
		readonly sources: readonly string[];
		readonly names: readonly string[];
		readonly mappings: string;
		readonly sourcesContent: readonly string[];
	}
	
	//# Code Adapted From https://github.com/jridgewell/sourcemap-codec
	
	type SourceMapSegment =
		[number] |
		[number, number, number, number] |
		[number, number, number, number, number];
	type SourceMapLine = SourceMapSegment[];
	type SourceMapMappings = SourceMapLine[];
	
	const comma = ",".charCodeAt(0);
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	const intToChar = new Uint8Array(64); // 64 possible chars.
	const charToInt = new Uint8Array(128); // z is 122 in ASCII
	
	for (let i = 0; i < chars.length; i++)
	{
		const c = chars.charCodeAt(i);
		intToChar[i] = c;
		charToInt[c] = i;
	}
	
	/** */
	function decode(mappings: string)
	{
		const state: [number, number, number, number, number] = new Int32Array(5) as any;
		const decoded: SourceMapMappings = [];

		let index = 0;
		do
		{
			const semi = indexOf(mappings, index);
			const line: SourceMapLine = [];
			let sorted = true;
			let lastCol = 0;
			state[0] = 0;

			for (let i = index; i < semi; i++)
			{
				let seg: SourceMapSegment;
				i = decodeInteger(mappings, i, state, 0); // genColumn
				
				const col = state[0];
				if (col < lastCol)
					sorted = false;
				
				lastCol = col;
				
				if (hasMoreVlq(mappings, i, semi))
				{
					i = decodeInteger(mappings, i, state, 1); // sourcesIndex
					i = decodeInteger(mappings, i, state, 2); // sourceLine
					i = decodeInteger(mappings, i, state, 3); // sourceColumn
					
					if (hasMoreVlq(mappings, i, semi))
					{
						i = decodeInteger(mappings, i, state, 4); // namesIndex
						seg = [col, state[1], state[2], state[3], state[4]];
					}
					else seg = [col, state[1], state[2], state[3]];
				}
				else seg = [col];

				line.push(seg);
			}

			if (!sorted)
				sort(line);
			
			decoded.push(line);
			index = semi + 1;
		}
		while (index <= mappings.length);

		return decoded;
	}
	
	/** */
	function indexOf(mappings: string, index: number)
	{
		const idx = mappings.indexOf(";", index);
		return idx === -1 ? mappings.length : idx;
	}
	
	/** */
	function decodeInteger(
		mappings: string,
		pos: number,
		state: SourceMapSegment,
		j: number)
	{
		let value = 0;
		let shift = 0;
		let integer = 0;
		
		do
		{
			const c = mappings.charCodeAt(pos++);
			integer = charToInt[c];
			value |= (integer & 31) << shift;
			shift += 5;
		}
		while (integer & 32);
		
		const shouldNegate = value & 1;
		value >>>= 1;
		
		if (shouldNegate)
			value = -0x80000000 | -value;
		
		state[j] += value;
		return pos;
	}
	
	/** */
	function hasMoreVlq(mappings: string, i: number, length: number)
	{
		if (i >= length)
			return false;
		
		return mappings.charCodeAt(i) !== comma;
	}
	
	/** */
	function sort(line: SourceMapSegment[])
	{
		line.sort(sortComparator);
	}
	
	/** */
	function sortComparator(a: SourceMapSegment, b: SourceMapSegment)
	{
		return a[0] - b[0];
	}
}
