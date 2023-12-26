
namespace Straw
{
	/** */
	export interface ImageParams
	{
		readonly name: string;
		readonly extension: string;
		readonly start: number;
		readonly end: number;
		readonly width: number;
		readonly height: number;
		readonly blur: number;
		readonly gray: boolean;
	}
	
	/** @internal */
	export namespace ImageProcessor
	{
		/** */
		export async function processIcon(inputImageFile: Fila, siteRootFolder: Fila)
		{
			const sizes = Straw.iconSizes.appleTouch.concat(Straw.iconSizes.generic);
			const iconDestFolder = siteRootFolder.down(SiteFolder.icon);
			
			let photonImage = await readPhotonImage(inputImageFile);
			const width = photonImage.get_width();
			const height = photonImage.get_height();
			const size = Math.min(width, height);
			const x1 = width / 2 - size / 2;
			const x2 = width / 2 + size / 2;
			const y1 = height / 2 - size / 2;
			const y2 = height / 2 + size / 2;
			photonImage = photon.crop(photonImage, x1, y1, x2, y2);
			
			for (const size of sizes)
			{
				const name = getIconFileName(inputImageFile.name, size);
				const iconDestFile = iconDestFolder.down(name);
				const iconResized = photon.resize(photonImage, size, size, 5);
				await iconDestFile.writeBinary(iconResized.get_bytes());
			}
		}
		
		/**
		 * 
		 */
		export function getIconFileName(iconFileName: string, size: number)
		{
			const dotPos = iconFileName.lastIndexOf(".");
			if (dotPos < 0 || iconFileName.includes("/"))
				throw new Error("Invalid icon file name: " + iconFileName);
			
			const fileNameNoExt = iconFileName.slice(0, dotPos);
			const ext = iconFileName.slice(dotPos);
			return `${fileNameNoExt}.${size}x${size}${ext}`;
		}
		
		/**
		 * Finds image files in the specified search root and below,
		 * with the specified extensionless name.
		 */
		export async function findImage(searchRoot: Fila, nameMaybeExtensionless: string)
		{
			const queue = await searchRoot.readDirectory();
			const hasExtension = extensions.some(e => nameMaybeExtensionless.endsWith(e));
			
			// If "base" has a slash in it, then it's treated assumed to be an absolute path.
			if (nameMaybeExtensionless.includes("/"))
			{
				if (hasExtension)
				{
					const fila = searchRoot.down(nameMaybeExtensionless);
					if (await fila.exists())
						return fila;
				}
				else for (const fila of extensions.map(e => searchRoot.down(nameMaybeExtensionless)))
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
					if (fila.name === nameMaybeExtensionless)
						return fila;
				}
				else if (extensions.map(e => nameMaybeExtensionless + e).some(s => s === fila.name))
					return fila;
			}
			return null;
		}
		
		export const extensions = [".gif", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".svg"];
		
		/** */
		export async function processImage(
			inputImageFile: Fila,
			outputImageFolder: Fila,
			params: ImageParams)
		{
			const imageCrc = await Util.computeFileCrc(inputImageFile);
			const nameNoExt = inputImageFile.name.slice(0, -inputImageFile.extension.length);
			const parts = [nameNoExt, imageCrc];
			let finalFileName = "";
			
			if (inputImageFile.extension === ".svg")
			{
				finalFileName = parts.join(".") + inputImageFile.extension;
				await inputImageFile.copy(outputImageFolder.down(finalFileName));
			}
			else
			{
				if (params.width)
					parts.push(params.width + "w");
				
				if (params.height)
					parts.push(params.height + "h");
				
				if (params.gray)
					parts.push("g");
				
				if (params.blur)
					parts.push(params.blur + "b");
				
				finalFileName = parts.join(".") + inputImageFile.extension;
				const finalFila = outputImageFolder.down(finalFileName);
				
				if (!await finalFila.exists())
				{
					let photonImage = await readPhotonImage(inputImageFile);
					const originalWidth = photonImage.get_width();
					const originalHeight = photonImage.get_height();
					const ratio = originalWidth / originalHeight;
					
					let width = 0;
					let height = 0;
					
					if (params.width && !params.height)
					{
						width = params.width;
						height = params.width / ratio;
					}
					else if (!params.width && params.height)
					{
						width = params.height * ratio;
						height = params.height;
					}
					else if (params.width && params.height)
					{
						width = params.width;
						height = params.height;
					}
					else
					{
						width = originalWidth;
						height = originalHeight;
					}
					
					if (width !== originalWidth || height !== originalHeight)
						photonImage = photon.resize(photonImage, width, height, 5);
					
					if (params.gray)
						photon.grayscale(photonImage);
					
					if (params.blur)
						photon.gaussian_blur(photonImage, params.blur);
					
					await finalFila.writeBinary(photonImage.get_bytes());
				}
			}
			
			return SiteFolder.images + finalFileName;
		}
		
		/** */
		async function readPhotonImage(imageFila: Fila)
		{
			if (!await imageFila.exists())
				throw console.error("File does not exist: " + imageFila.path);
			
			const bytes = new Uint8Array(await imageFila.readBinary());
			const photonImage = photon.PhotonImage.new_from_byteslice(bytes);
			return photonImage;
		}
		
		const photon = require("@silvia-odwyer/photon-node") as 
			typeof import("@silvia-odwyer/photon-node");
	}
}