
namespace Straw
{
	/**
	 * A class that provides easy access to well-known directories within
	 *  the project.
	 */
	export class Directories
	{
		constructor(projectDirectory: string)
		{
			this._project = new Fila(projectDirectory);
			this._site = this._project.down(ProjectFolder.site);
			this._source = this._project.down(ProjectFolder.source);
			this._static = this._project.down(ProjectFolder.static);
			this._support = this._project.down(ProjectFolder.support);
			
			this.fila = {
				project: this._project,
				site: this._site,
				source: this._source,
				static: this._static,
				support: this._support,
			};
		}
		
		/** @internal */
		readonly fila;
		
		/**
		 * Gets or set the root directory of the project that contains all other directories.
		 */
		get project()
		{
			return this._project.path;
		}
		private _project;
		
		/** */
		get site()
		{
			return this._site.path;
		}
		private _site;
		
		/** */
		get source()
		{
			return this._source.path;
		}
		private _source;
		
		/** */
		get static()
		{
			return this._static.path;
		}
		private _static;
		
		/** */
		get support()
		{
			return this._support.path;
		}
		private _support;
		
	}
}
