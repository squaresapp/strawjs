
namespace Straw
{
	/** */
	export interface ImageParams
	{
		name: string;
		extension: string;
		start: number;
		end: number;
		width: number;
		height: number;
		crop: TCrop | null;
		hue: number;
		sat: number;
		light: number;
		blur: number;
	}
	
	/** */
	export type TCrop = [number, number, number, number];
	
	/** @internal */
	export namespace ImageProcessor
	{
		/** */
		export async function processIcon(inputImageFile: Fila, siteRootFolder: Fila)
		{
			const sizes = Straw.iconSizes.appleTouch.concat(Straw.iconSizes.generic);
			const iconDestFolder = siteRootFolder.down(SiteFolder.icons);
			
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
		
		/** */
		export async function calculateIconCrop(iconFile: Fila)
		{
			let photonImage = await readPhotonImage(iconFile);
			const width = photonImage.get_width();
			const height = photonImage.get_height();
			if (width === height)
				return null;
			
			const size = Math.min(width, height);
			const x1 = width / 2 - size / 2;
			const y1 = height / 2 - size / 2;
			const x2 = width / 2 + size / 2;
			const y2 = height / 2 + size / 2;
			return [x1, y1, x2, y2] as TCrop;
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
		export async function processImage(inputFile: Fila, outputFolder: Fila, params: ImageParams)
		{
			const fileCrc = await Util.computeFileCrc(inputFile);
			const nameNoExt = inputFile.name.slice(0, -inputFile.extension.length);
			const parts = [nameNoExt, fileCrc];
			let finalFileName = "";
			
			if (inputFile.extension === ".svg")
			{
				finalFileName = parts.join(".") + inputFile.extension;
				await inputFile.copy(outputFolder.down(finalFileName));
			}
			else
			{
				if (params.crop)
				{
					const c = params.crop;
					parts.push(c[0] + "x" + c[1] + "y" + c[2] + "x" + c[3] + "y");
				}
				
				if (params.width)
					parts.push(params.width + "w");
				
				if (params.height)
					parts.push(params.height + "h");
				
				if (params.hue)
					parts.push(params.hue + "hue");
				
				if (params.sat)
					parts.push(params.sat + "sat");
				
				if (params.light)
					parts.push(params.light + "light");
				
				if (params.blur)
					parts.push(params.blur + "b");
				
				finalFileName = parts.join(".") + inputFile.extension;
				const finalFila = outputFolder.down(finalFileName);
				
				if (!await finalFila.exists())
				{
					let photonImage = await readPhotonImage(inputFile);
					let fallbackWidth = 0;
					let fallbackHeight = 0;
					
					if (params.crop)
					{
						const [x1, y1, x2, y2] = params.crop;
						fallbackWidth = x2- x1;
						fallbackHeight = y2 - y1;
					}
					else
					{
						fallbackWidth = photonImage.get_width();
						fallbackHeight = photonImage.get_height();
					}
					
					const ratio = fallbackWidth / fallbackHeight;
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
						width = fallbackWidth;
						height = fallbackHeight;
					}
					
					if (params.crop)
					{
						const c = params.crop;
						photonImage = photon.crop(photonImage, c[0], c[1], c[2], c[3]);
					}
					
					if (width !== fallbackWidth || height !== fallbackHeight)
						photonImage = photon.resize(photonImage, width, height, 5);
					
					if (params.hue)
					{
						const hue = params.hue > 0 ? 
							(params.hue % 360) / 360 :
							(360 + params.hue % 360) / 360;
						
						photon.hue_rotate_hsl(photonImage, hue);
					}
					
					if (params.sat < 0)
						photon.desaturate_hsl(photonImage, 1 - Math.max(0, Math.min(1, params.sat)));
					
					if (params.sat > 0)
						photon.saturate_hsl(photonImage, Math.max(0, Math.min(1, params.sat)));
					
					if (params.light < 0)
						photon.darken_hsl(photonImage, 1 - Math.max(0, Math.min(1, params.sat)));
					
					if (params.light > 0)
						photon.lighten_hsl(photonImage, Math.max(0, Math.min(1, params.sat)));
					
					if (params.blur)
						photon.gaussian_blur(photonImage, params.blur);
					
					await finalFila.writeBinary(photonImage.get_bytes());
				}
			}
			
			return finalFileName;
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
		
		const photon: typeof import("@silvia-odwyer/photon-node") = (() =>
		{
			if (NODE)
				return require("@silvia-odwyer/photon-node");
			
			if (TAURI)
				return Util.getImport("./photon_rs.js");
			
			throw new Error("Unsupported platform");
		})();
	}
}