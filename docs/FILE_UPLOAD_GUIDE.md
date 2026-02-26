# File Upload Guide - Cloudinary Integration

## Overview
The Igihango backend handles file uploads to Cloudinary. Files are sent to the backend, which uploads them to Cloudinary and stores the URLs in the database.

## Architecture

```
Frontend → Backend API → Cloudinary → Get URL → Database (stores URL)
```

## Why This Approach?

1. **Security**: API secrets stay on backend
2. **Validation**: Backend validates files before upload
3. **Control**: Centralized upload logic
4. **Consistency**: All uploads follow same rules
5. **Tracking**: Backend logs all uploads

## Setup

### 1. Cloudinary Account
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret

### 2. Environment Variables
Add to your `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Backend API

### Upload Evidence Endpoint (Recommended)
```
POST /leader/tasks/:id/evidence/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: (binary file)
- description: "Foundation completed - 40% progress" (optional)
```

**Response:**
```json
{
  "id": 1,
  "fileUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/igihango/evidence/photo.jpg",
  "evidenceType": "image/jpeg",
  "description": "Foundation completed",
  "cloudinaryPublicId": "igihango/evidence/photo",
  "fileSize": 1024567,
  "format": "jpg",
  "createdAt": "2026-02-26T10:00:00Z",
  "uploadedBy": {
    "id": 5,
    "name": "Alice Mukamana",
    "email": "chief@gov.rw"
  }
}
```

### Add Evidence with URL (Alternative)
```
POST /leader/tasks/:id/evidence
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "fileUrl": "https://res.cloudinary.com/your-cloud/image/upload/...",
  "evidenceType": "image/jpeg",
  "description": "Foundation completed"
}
```

### Get Evidence Endpoint
```
GET /leader/tasks/:id/evidence
Authorization: Bearer {token}

Response:
[
  {
    "id": 1,
    "fileUrl": "https://res.cloudinary.com/...",
    "evidenceType": "image/jpeg",
    "description": "Foundation completed",
    "createdAt": "2026-02-26T10:00:00Z",
    "uploadedBy": {
      "id": 5,
      "name": "Alice Mukamana",
      "email": "chief@gov.rw"
    }
  }
]
```

## Frontend Implementation

### Using Fetch API
```javascript
const uploadEvidence = async (taskId, file, description) => {
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }
  
  const response = await fetch(`/leader/tasks/${taskId}/evidence/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  return await response.json();
};

// Usage
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  const result = await uploadEvidence(taskId, file, 'Progress update');
  console.log('Uploaded:', result.fileUrl);
};
```

### Using Axios
```javascript
import axios from 'axios';

const uploadEvidence = async (taskId, file, description) => {
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }
  
  const response = await axios.post(
    `/leader/tasks/${taskId}/evidence/upload`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data;
};
```

### React Component Example
```jsx
import { useState } from 'react';

function EvidenceUpload({ taskId }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadEvidence(taskId, file, description);
      alert('Evidence uploaded successfully!');
      setFile(null);
      setDescription('');
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        onChange={(e) => setFile(e.target.files[0])}
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Evidence'}
      </button>
    </form>
  );
}
```

## Supported File Types

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Videos
- MP4 (.mp4)
- MPEG (.mpeg)
- QuickTime (.mov)
- AVI (.avi)

### Documents
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)

## File Size Limits

- Maximum file size: 50MB
- Recommended: Keep images under 10MB, videos under 50MB

## Security

### Backend Validation
- File type validation (only allowed types)
- File size validation (max 50MB)
- Authentication required (JWT)
- Task ownership verification

### Cloudinary Security
- Files stored in secure folders
- Auto-optimization enabled
- CDN delivery with HTTPS

## Error Handling

### Common Errors

**400 Bad Request - Invalid file type**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Allowed types: images, videos, PDF, Word, Excel"
}
```

**400 Bad Request - File too large**
```json
{
  "statusCode": 400,
  "message": "File too large. Maximum size is 50MB"
}
```

**404 Not Found - Task not found**
```json
{
  "statusCode": 404,
  "message": "Task not found"
}
```

### Frontend Error Handling
```javascript
try {
  const result = await uploadEvidence(taskId, file, description);
} catch (error) {
  if (error.response?.status === 400) {
    alert('Invalid file. Please check file type and size.');
  } else if (error.response?.status === 404) {
    alert('Task not found.');
  } else {
    alert('Upload failed. Please try again.');
  }
}
```

## Cloudinary Features

### Automatic Optimization
Backend automatically applies:
- Quality optimization (`q_auto`)
- Format optimization (`f_auto`)

### Image Transformations
You can transform Cloudinary URLs:
```
Original: https://res.cloudinary.com/demo/image/upload/v123/igihango/evidence/photo.jpg
Thumbnail: https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fill/v123/igihango/evidence/photo.jpg
Optimized: https://res.cloudinary.com/demo/image/upload/q_auto,f_auto/v123/igihango/evidence/photo.jpg
```

## Testing

### Using Postman
1. Create POST request to `/leader/tasks/1/evidence/upload`
2. Set Authorization header: `Bearer {your_token}`
3. In Body tab, select "form-data"
4. Add key "file" with type "File", select your file
5. Add key "description" with type "Text", enter description
6. Send request

### Using cURL
```bash
curl -X POST http://localhost:3001/leader/tasks/1/evidence/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.jpg" \
  -F "description=Progress update"
```

## Monitoring

### Backend Logs
The backend logs:
- File uploads (success/failure)
- File sizes
- Upload duration
- Cloudinary responses

### Cloudinary Dashboard
Monitor:
- Upload volume
- Storage usage
- Bandwidth usage
- Transformation usage

## Best Practices

1. **Validate on Frontend**: Check file type/size before upload
2. **Show Progress**: Display upload progress to users
3. **Handle Errors**: Provide clear error messages
4. **Optimize Images**: Resize large images before upload if possible
5. **Use Descriptions**: Encourage users to add meaningful descriptions

## Troubleshooting

### Upload Fails
- Check Cloudinary credentials in .env
- Verify file type is allowed
- Check file size (max 50MB)
- Ensure JWT token is valid

### Slow Uploads
- Large files take longer
- Check internet connection
- Consider compressing files
- Use Cloudinary's auto-optimization

### URL Not Working
- Verify Cloudinary cloud name
- Check URL format
- Ensure file wasn't deleted from Cloudinary
- Check CORS settings if accessing from browser

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)
- [Video Transformations](https://cloudinary.com/documentation/video_manipulation_and_delivery)
