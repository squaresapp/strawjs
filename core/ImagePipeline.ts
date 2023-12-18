
namespace Straw
{
	type PhotonImage = typeof import("@silvia-odwyer/photon-node").PhotonImage;
	let photon: typeof import("@silvia-odwyer/photon-node");
	
	/**
	 * @internal
	 */
	export class ImagePipeline
	{
		/** */
		static createReference(base: string, options: ImageOptions)
		{
			const marker: ImageMarker = { base, ...options };
			
			return (
				imagePrefix + 
				btoa(JSON.stringify(marker)) + 
				imageSuffix
			);
		}
		
		/** */
		constructor(
			private readonly imagesRoot: Fila,
			private readonly outputRoot: Fila) { }
		
		/** */
		async replaceReference(reference: string)
		{
			const start = reference.indexOf(imagePrefix);
			if (start < 0)
				return null;
			
			const end = reference.indexOf(imageSuffix, start);
			const base64Text = reference.slice(start + imagePrefix.length, end);
			const clearText = atob(base64Text);
			const marker: ImageMarker = tryParseJson(clearText)!;
			const base = (() =>
			{
				for (const ext of imageExtensions)
					if (marker.base.endsWith(ext))
						return marker.base.slice(0, -ext.length);
				
				return marker.base;
			})();
			
			const imageFila = await this.findImage(marker.base);
			if (!imageFila)
			{
				console.error("Image could not be resolved: " + marker.base);
				debugger;
				return null;
			}
			
			const imageCrc = await this.computeFileCrc(imageFila);
			const parts = [base, imageCrc];
			
			if (marker.width)
				parts.push(marker.width + "w");
			
			if (marker.height)
				parts.push(marker.height + "h");
			
			if (marker.grayscale)
				parts.push("g");
			
			if (marker.blur)
				parts.push(marker.blur + "b");
			
			const finalFileName = parts.join(".") + imageFila.extension;
			const finalFila = this.outputRoot.down(finalFileName);
			
			if (!await finalFila.exists())
			{
				photon ||= require("@silvia-odwyer/photon-node");
				
				const bytes = new Uint8Array(await imageFila.readBinary());
				let photonImage = photon.PhotonImage.new_from_byteslice(bytes);
				const originalWidth = photonImage.get_width();
				const originalHeight = photonImage.get_height();
				const ratio = originalWidth / originalHeight;
				
				let width = 0;
				let height = 0;
				
				if (marker.width && !marker.height)
				{
					width = marker.width;
					height = marker.width / ratio;
				}
				else if (!marker.width && marker.height)
				{
					width = marker.height * ratio;
					height = marker.height;
				}
				else if (marker.width && marker.height)
				{
					width = marker.width;
					height = marker.height
				}
				else
				{
					width = originalWidth;
					height = originalHeight;
				}
				
				if (width !== originalWidth || height !== originalHeight)
					photonImage = photon.resize(photonImage, width, height, 5);
				
				if (marker.grayscale)
					photon.grayscale(photonImage);
				
				if (marker.blur)
					photon.gaussian_blur(photonImage, marker.blur);
				
				await finalFila.writeBinary(photonImage.get_bytes());
			}
			
			const replacedValue = 
				reference.slice(0, start) +
				Folder.images +
				finalFileName +
				reference.slice(end + imageSuffix.length);
			
			return { marker, replacedValue };
		}
		
		/** */
		private async findImage(base: string)
		{
			const queue = await this.imagesRoot.readDirectory();
			const hasExtension = imageExtensions.some(e => base.endsWith(e));
			
			// If "base" has a slash in it, then it's treated assumed to be an absolute path.
			if (base.includes("/"))
			{
				if (hasExtension)
				{
					const fila = this.imagesRoot.down(base);
					if (await fila.exists())
						return fila;
				}
				else for (const fila of imageExtensions.map(e => this.imagesRoot.down(base)))
					if (await fila.exists())
						return fila;
			}
			
			while (queue.length)
			{
				const fila = queue.shift();
				if (!fila)
					return null;
				
				if (await fila.isDirectory())
					queue.push(...await fila.readDirectory());
				
				if (hasExtension)
				{
					if (fila.name === base)
						return fila;
				}
				else if (imageExtensions.map(e => base + e).some(s => s === fila.name))
					return fila;
			}
			
			return null;
		}
		
		/** */
		private async computeFileCrc(fila: Fila)
		{
			const crc = require("crc-32") as typeof import("crc-32");
			const contents = new Uint8Array(await fila.readBinary());
			const num = crc.buf(contents) + (2 ** 32 / 2);
			return num.toString(36);
		}
	}
	
	/** */
	export interface ImageOptions
	{
		width?: number;
		height?: number;
		grayscale?: boolean;
		blur?: number;
	}
	
	/** */
	export interface ImageMarker extends ImageOptions
	{
		base: string;
	}
	
	const imagePrefix = "straw-local://";
	const imageSuffix = "###";
	const imageExtensions = [".gif", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".svg"];
}
