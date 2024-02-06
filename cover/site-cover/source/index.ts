
declare namespace JSX
{
	interface IntrinsicElements
	{
		red: E<{ size: number, path: string }>;
	}
}

Straw.define("red", (properties, params) =>
{
	properties.path;
	return raw.span("red", params);
});

// Designer meta data
Straw.define("red", {
	description: "Red markup",
	has: ["red"],
	markup: true
});

// Designer meta data
Straw.define("body", {
	has: ["section"]
});

namespace Theme
{
	/** */
	export function button()
	{
		return raw.button(raw.text("Button"));
	}
}
