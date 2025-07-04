# SharePoint Document Library Setup for menuData.ts

## Overview

This implementation fetches the `menuData.ts` file directly from a SharePoint document library, allowing you to manage your navigation menu by simply uploading a new version of the TypeScript file.

## Setup Instructions

### 1. Create or Use Existing Document Library

You can use the default "Shared Documents" library or create a new one:

1. Go to your SharePoint site
2. Navigate to "Site Contents"
3. Click "New" → "Document Library" (if creating new)
4. Name it appropriately (e.g., "Configuration Files")

### 2. Upload menuData.ts File

Create a file named `menuData.ts` with your menu structure and upload it to the document library.

#### Sample menuData.ts File Structure:

```typescript
export const menuData = {
    "navigation": [
        {
            "title": "My Sites",
            "href": "",
            "megaMenu": {
                "columns": [
                    {
                        "title": "",
                        "items": [
                            { "title": "Academic Affairs Staff Workspace", "href": "/sites/academicaffairsworkspace" },
                            { "title": "Adjunct Faculty Workspace", "href": "/sites/adjunctfacultyworkspace" },
                            { "title": "Forms Central", "href": "/sites/formscentral" }
                        ]
                    },
                    {
                        "title": "",
                        "items": [
                            { "title": "Student Resources", "href": "/sites/studentresources" },
                            { "title": "Faculty Connect", "href": "/sites/facultyconnect" }
                        ]
                    }
                ]
            }
        },
        {
            "title": "Forms Central",
            "href": "/sites/formscentral"
        },
        {
            "title": "Library",
            "href": "https://library.law.fordham.edu/"
        },
        {
            "title": "Apps",
            "href": "",
            "megaMenu": {
                "columns": [
                    {
                        "title": "Global apps",
                        "items": [
                            { "title": "Blackboard", "href": "https://fordham.blackboard.com/" },
                            { "title": "GMail", "href": "https://gmail.fordham.edu/" },
                            { "title": "Microsoft Office 365", "href": "https://login.microsoftonline.com/" }
                        ]
                    },
                    {
                        "title": "Academic apps",
                        "items": [
                            { "title": "Course Evaluations", "href": "/sites/courseevaluations" },
                            { "title": "Examinations", "href": "/sites/examinations" }
                        ]
                    }
                ]
            }
        },
        {
            "title": "IT Support Portal",
            "href": "https://fordhamlaw.freshservice.com/support/home"
        }
    ]
};
```

### 3. Configure Service Settings

Update the service configuration in `src/services/sharepointDocumentService.ts`:

```typescript
constructor() {
    this.baseUrl = window.location.origin; // Current SharePoint site
    this.documentLibrary = 'Shared Documents'; // Change to your document library name
    this.fileName = 'menuData.ts'; // The TypeScript file name
}
```

### 4. Set Permissions

Ensure the application and users have appropriate permissions:

- **Read Access**: Required for the application to fetch the file
- **Edit Access**: Required for users who need to update the menu

### 5. File Upload Process

To update the menu:

1. Edit your local `menuData.ts` file
2. Upload the new version to the SharePoint document library
3. The application will automatically fetch the updated file (cache expires every 30 minutes)
4. For immediate updates, you can clear the browser cache or wait for the cache to expire

## API Endpoints Used

The service uses these SharePoint REST API endpoints:

### Primary Method:
```
GET /_api/web/GetFileByServerRelativeUrl('/Shared Documents/menuData.ts')/$value
```

### Alternative Method:
```
GET /_api/web/GetFileByServerRelativeUrl('/Shared Documents/menuData.ts')
GET /_api/web/GetFileByServerRelativeUrl('/Shared Documents/menuData.ts')/$value
```

### File Upload (for programmatic updates):
```
POST /_api/web/GetFolderByServerRelativeUrl('/Shared Documents')/Files/Add(url='menuData.ts',overwrite=true)
```

## Features

### ✅ **File-Based Management**
- Store menu configuration as a TypeScript file
- Version control through SharePoint's built-in versioning
- Easy to edit with any text editor

### ✅ **Caching**
- 30-minute cache to improve performance
- Automatic cache invalidation
- Fallback data if SharePoint is unavailable

### ✅ **Error Handling**
- Multiple fetch methods for reliability
- Graceful fallback to default menu
- Detailed error logging

### ✅ **Security**
- Uses SharePoint's built-in authentication
- Respects SharePoint permissions
- Secure file access through REST API

### ✅ **Performance**
- Cached responses reduce server load
- Efficient file parsing
- Minimal network requests

## File Structure Requirements

The `menuData.ts` file must:

1. **Export a constant named `menuData`**
2. **Follow the exact structure** shown in the sample
3. **Use valid JSON-like syntax** (the parser handles TypeScript to JSON conversion)
4. **Include all required properties** for navigation items

## Troubleshooting

### Common Issues:

1. **File Not Found (404)**
   - Check the document library name and file path
   - Ensure the file exists in the specified location
   - Verify permissions

2. **Parse Errors**
   - Validate the TypeScript syntax in your file
   - Ensure proper JSON structure
   - Check for missing commas or brackets

3. **Permission Denied (403)**
   - Verify the application has read access to the document library
   - Check SharePoint site permissions

4. **Cache Issues**
   - Clear browser localStorage
   - Wait for cache expiration (30 minutes)
   - Use browser developer tools to clear cache

### Debug Mode:

Enable console logging to see detailed information about the fetch process and any parsing errors.

## Benefits

- **Simple Management**: Just upload a new file to update the menu
- **Version Control**: SharePoint tracks file versions automatically
- **No Database**: Uses existing SharePoint document storage
- **Familiar Format**: Standard TypeScript file format
- **Backup**: SharePoint handles backup and recovery
- **Collaboration**: Multiple people can manage the file with proper permissions