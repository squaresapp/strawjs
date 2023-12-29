
namespace Straw
{
	/**
	 * An enumeration that stores the well-known folders
	 * within Straw.
	 */
	export const enum SiteFolder
	{
		resources = "/resources/",
		icons = "/resources/icon/",
		images = "/resources/images/",
		fonts = "/resources/fonts/",
	}
	
	/**
	 * 
	 */
	export const enum ProjectFolder
	{
		site = "site/",
		source = "source/",
		static = "static/",
	}
	
	/**
	 * An object that stores the various icon size variations to generate 
	 * for individual targets.
	 */
	export const iconSizes = {
		generic: [16, 32, 96, 192],
		appleTouch: [57, 60, 72, 76, 114, 120, 144, 152, 180],
	};
}
