# Mega Menu SPFx Extension

This is a SharePoint Framework (SPFx) Application Customizer extension that adds a mega menu to SharePoint pages. The extension fetches menu configuration from a TypeScript file stored in a SharePoint document library.

## Features

- **Document Library Integration**: Fetches `menuData.ts` file from SharePoint document library
- **Responsive Design**: Works on both desktop and mobile devices
- **Mega Menu Support**: Multi-column dropdown menus
- **Caching**: 30-minute cache for improved performance
- **Fallback Support**: Graceful fallback when SharePoint is unavailable
- **SPFx 1.4.0 Compatible**: Built for SharePoint Framework version 1.4.0

## Prerequisites

- Node.js 8.x or 10.x
- SharePoint Framework 1.4.0
- SharePoint Online or SharePoint 2019

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### 1. Update serve.json
Update `config/serve.json` with your SharePoint site URL:

```json
{
  "pageUrl": "https://yourtenant.sharepoint.com/sites/yoursite/SitePages/Home.aspx"
}
```

### 2. Create menuData.ts File
Create a `menuData.ts` file with your menu structure:

```typescript
export const menuData = {
    "navigation": [
        {
            "title": "My Sites",
            "href": "",
            "megaMenu": {
                "columns": [
                    {
                        "title": "Workspaces",
                        "items": [
                            { "title": "Academic Affairs", "href": "/sites/academicaffairs" },
                            { "title": "Forms Central", "href": "/sites/formscentral" }
                        ]
                    }
                ]
            }
        },
        {
            "title": "Library",
            "href": "https://library.example.com/"
        }
    ]
};
```

### 3. Upload to SharePoint
Upload the `menuData.ts` file to your SharePoint document library (default: "Shared Documents").

## Development

### Build and Test
```bash
# Build the solution
gulp build

# Test locally
gulp serve
```

### Package for Deployment
```bash
# Create production build
gulp bundle --ship

# Package solution
gulp package-solution --ship
```

## Deployment

1. Upload the `.sppkg` file from `sharepoint/solution/` to your App Catalog
2. Deploy the solution to your SharePoint sites
3. The extension will automatically appear on all pages

## Configuration Options

The extension supports these properties:

- `documentLibrary`: Name of the document library (default: "Shared Documents")
- `fileName`: Name of the TypeScript file (default: "menuData.ts")

Configure these in the SharePoint Admin Center when deploying the extension.

## File Structure

```
src/
├── extensions/
│   └── megaMenu/
│       ├── MegaMenuApplicationCustomizer.ts    # Main extension file
│       ├── services/
│       │   └── MegaMenuService.ts              # SharePoint service
│       ├── components/
│       │   └── MegaMenu.tsx                    # React component (optional)
│       └── loc/                                # Localization files
config/
├── package-solution.json                       # Solution configuration
├── serve.json                                  # Development configuration
└── config.json                                 # Bundle configuration
```

## Menu Data Structure

The `menuData.ts` file should follow this structure:

```typescript
export const menuData = {
    navigation: [
        {
            title: "Menu Item",
            href: "/link-url",
            megaMenu?: {
                columns: [
                    {
                        title: "Column Title",
                        items: [
                            {
                                title: "Link Title",
                                href: "/link-url"
                            }
                        ]
                    }
                ]
            }
        }
    ]
};
```

## Troubleshooting

### Common Issues

1. **File Not Found**: Ensure the `menuData.ts` file exists in the specified document library
2. **Permission Denied**: Verify the extension has read access to the document library
3. **Parse Errors**: Check the TypeScript syntax in your menu data file

### Debug Mode

Enable browser developer tools to see detailed console logs about the fetch process and any errors.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Internet Explorer 11 (with SPFx 1.4.0 support)

## License

This project is licensed under the MIT License.