import "server-only";

import { v2 as cloudinary } from "cloudinary";

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
  if (!cloudName || !apiKey || !apiSecret || !folderPrefix) {
    throw new Error("Cloudinary credentials and folder prefix are required.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudinary, cloudName, apiKey, apiSecret, folderPrefix };
}

export function cloudinaryImageUrl(asset: { publicId: string; version: number; format: string; deliveryType?: string }, transformation = "f_auto,q_auto") {
  const { cloudinary } = cloudinaryConfig();
  return cloudinary.url(asset.publicId, {
    secure: true,
    version: asset.version,
    format: asset.format,
    type: asset.deliveryType ?? "upload",
    sign_url: asset.deliveryType === "authenticated",
    transformation: transformation.split(",").map((part) => part === "f_auto" ? { fetch_format: "auto" } : { quality: "auto" }),
  });
}
