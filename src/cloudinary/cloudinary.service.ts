import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'igihango/evidence',
    ): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'auto', // Automatically detect file type (image, video, raw)
                    transformation: [
                        { quality: 'auto' }, // Optimize quality
                        { fetch_format: 'auto' }, // Optimize format
                    ],
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error('Upload failed - no result'));
                    resolve(result);
                },
            );

            uploadStream.end(file.buffer);
        });
    }

    async deleteFile(publicId: string): Promise<any> {
        return cloudinary.uploader.destroy(publicId);
    }

    getPublicIdFromUrl(url: string): string {
        // Extract public_id from Cloudinary URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/file.jpg
        // Returns: folder/file
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return '';

        const pathParts = parts.slice(uploadIndex + 2); // Skip 'upload' and version
        const filename = pathParts.join('/').split('.')[0]; // Remove extension
        return filename;
    }
}
