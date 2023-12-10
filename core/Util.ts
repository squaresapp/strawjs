
namespace Straw
{
	/** @internal */
	export function tryParseJson<T = any>(json: any): T | null
	{
		try
		{
			return JSON.parse(json);
		}
		catch (e) { }
		
		return null;
	}
}
