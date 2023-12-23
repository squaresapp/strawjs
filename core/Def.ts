
namespace Straw
{
	/**
	 * An interface that defines the aspects of the package.json file that are specific to straw.
	 */
	export interface IPackageJson
	{
		readonly straw: {
			/**
			 * Stores the folder where output resides, relative to this package.json file.
			 */
			out: string;
			/**
			 * Stores the folder that contains static files, which is symlinked into the out folder. 
			 */
			static: string;
			/**
			 * Stores the base folder where to search for images. 
			 * Defaults to the same folder as the package.json file.
			 */
			images: string;
		};
	}
	
	/**
	 * An enumeration that stores the well-known folders
	 * within Straw.
	 */
	export const enum SiteFolder
	{
		resources = "/resources/",
		scripts = "/resources/scripts/",
		icon = "/resources/icon/",
		images = "/resources/images/",
		fonts = "/resources/fonts/",
		css = "/resources/css/",
	}
	
	/**
	 * 
	 */
	export const enum ProjectFolder
	{
		site = "/site/",
		source = "/source/",
		static = "/static/",
	}
}
