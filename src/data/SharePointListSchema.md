# SharePoint List Schema for Menu Configuration

## List Name: `MenuConfiguration`

Create a SharePoint list with the following columns to manage your navigation menu:

### Required Columns:

1. **Title** (Single line of text) - Default SharePoint column
   - Description: Internal identifier for the menu item

2. **MenuTitle** (Single line of text) - Required
   - Description: Display text for the menu item
   - Example: "My Sites", "Forms Central", "Library"

3. **MenuHref** (Single line of text) - Optional
   - Description: URL/link for the menu item
   - Example: "/sites/formscentral", "https://library.law.fordham.edu/"

4. **ParentMenuId** (Number) - Optional
   - Description: ID of the parent menu item (for sub-menu items)
   - Leave empty for top-level menu items

5. **MenuOrder** (Number) - Required
   - Description: Sort order for menu items
   - Example: 1, 2, 3, etc.

6. **HasMegaMenu** (Yes/No) - Required
   - Description: Whether this menu item has a mega menu dropdown
   - Default: No

7. **ColumnTitle** (Single line of text) - Optional
   - Description: Title for the column in mega menu (for sub-items)
   - Example: "Global apps", "Academic apps", "Student apps"

8. **ColumnOrder** (Number) - Optional
   - Description: Sort order for columns in mega menu
   - Example: 1, 2, 3, etc.

9. **IsActive** (Yes/No) - Required
   - Description: Whether this menu item is currently active/visible
   - Default: Yes

### Sample Data Structure:

#### Top-level Menu Items:
| Title | MenuTitle | MenuHref | ParentMenuId | MenuOrder | HasMegaMenu | IsActive |
|-------|-----------|----------|--------------|-----------|-------------|----------|
| MySites | My Sites | | | 1 | Yes | Yes |
| FormsCentral | Forms Central | /sites/formscentral | | 2 | No | Yes |
| Library | Library | https://library.law.fordham.edu/ | | 3 | No | Yes |
| Apps | Apps | | | 4 | Yes | Yes |

#### Sub-menu Items (for mega menus):
| Title | MenuTitle | MenuHref | ParentMenuId | MenuOrder | ColumnTitle | ColumnOrder | IsActive |
|-------|-----------|----------|--------------|-----------|-------------|-------------|----------|
| AcademicWorkspace | Academic Affairs Staff Workspace | /sites/academicaffairsworkspace | 1 | 1 | | 1 | Yes |
| AdjunctWorkspace | Adjunct Faculty Workspace | /sites/adjunctfacultyworkspace | 1 | 2 | | 1 | Yes |
| Blackboard | Blackboard | https://fordham.blackboard.com/ | 4 | 1 | Global apps | 1 | Yes |
| Gmail | GMail | https://gmail.fordham.edu/ | 4 | 2 | Global apps | 1 | Yes |

### Setup Instructions:

1. **Create the SharePoint List:**
   - Go to your SharePoint site
   - Click "New" → "List"
   - Choose "Blank list"
   - Name it "MenuConfiguration"

2. **Add Custom Columns:**
   - Add each column listed above with the specified data types
   - Set required/optional as indicated

3. **Configure Permissions:**
   - Ensure the application has read access to the list
   - Consider who should have edit permissions for menu management

4. **Populate Initial Data:**
   - Add your menu structure following the sample data format
   - Test with a few items first before adding all menu items

### Benefits:

- **Dynamic Menu Management:** Update menu items without code changes
- **User-Friendly:** Non-technical users can manage the navigation
- **Versioning:** SharePoint provides built-in version history
- **Permissions:** Control who can modify the menu structure
- **Backup:** SharePoint handles data backup and recovery
- **Caching:** The application caches menu data for performance

### API Endpoint Used:

The application will call:
```
/_api/web/lists/getbytitle('MenuConfiguration')/items?$select=Id,Title,MenuTitle,MenuHref,ParentMenuId,MenuOrder,HasMegaMenu,ColumnTitle,ColumnOrder,IsActive&$filter=IsActive eq true&$orderby=MenuOrder,ColumnOrder
```

This ensures only active menu items are retrieved and properly sorted.