interface MenuItem {
  title: string;
  href: string;
}

interface MenuColumn {
  title: string;
  items: MenuItem[];
}

interface MegaMenuData {
  columns: MenuColumn[];
}

interface NavigationItem {
  title: string;
  href: string;
  megaMenu?: MegaMenuData;
}

interface MenuData {
  navigation: NavigationItem[];
}

class SharePointDocumentService {
  private baseUrl: string;
  private documentLibrary: string;
  private fileName: string;

  constructor() {
    // These would typically come from environment variables or configuration
    this.baseUrl = window.location.origin; // Current SharePoint site
    this.documentLibrary = 'Shared Documents'; // Document library name
    this.fileName = 'menuData.ts'; // The TypeScript file name
  }

  /**
   * Fetches the menuData.ts file from SharePoint document library
   */
  async fetchMenuDataFile(): Promise<MenuData> {
    try {
      // SharePoint REST API endpoint to get file content
      const endpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')/$value`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
        credentials: 'same-origin' // Important for SharePoint authentication
      });

      if (!response.ok) {
        throw new Error(`SharePoint Document Library error: ${response.status} ${response.statusText}`);
      }

      const fileContent = await response.text();
      
      // Parse the TypeScript file content to extract the menuData
      return this.parseMenuDataFromFile(fileContent);
    } catch (error) {
      console.error('Error fetching menuData.ts from SharePoint:', error);
      // Fallback to local data if SharePoint is unavailable
      return this.getFallbackMenuData();
    }
  }

  /**
   * Alternative method using SharePoint REST API to get file metadata and content
   */
  async fetchMenuDataFileAlternative(): Promise<MenuData> {
    try {
      // Get file information first
      const fileInfoEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')`;
      
      const fileInfoResponse = await fetch(fileInfoEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
        },
        credentials: 'same-origin'
      });

      if (!fileInfoResponse.ok) {
        throw new Error(`File not found: ${fileInfoResponse.status}`);
      }

      // Get file content
      const contentEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')/$value`;
      
      const contentResponse = await fetch(contentEndpoint, {
        method: 'GET',
        credentials: 'same-origin'
      });

      if (!contentResponse.ok) {
        throw new Error(`Failed to fetch file content: ${contentResponse.status}`);
      }

      const fileContent = await contentResponse.text();
      return this.parseMenuDataFromFile(fileContent);
    } catch (error) {
      console.error('Error fetching menuData.ts from SharePoint (alternative method):', error);
      return this.getFallbackMenuData();
    }
  }

  /**
   * Parses the TypeScript file content to extract menuData
   */
  private parseMenuDataFromFile(fileContent: string): MenuData {
    try {
      // Remove TypeScript syntax and extract the data object
      // This is a simple parser - you might need to adjust based on your file format
      
      // Remove export statement and variable declaration
      let cleanContent = fileContent
        .replace(/export\s+const\s+menuData\s*=\s*/, '')
        .replace(/;\s*$/, ''); // Remove trailing semicolon
      
      // If the file has TypeScript interfaces or imports, remove them
      cleanContent = cleanContent
        .replace(/^import.*$/gm, '') // Remove import statements
        .replace(/^interface.*?^}/gms, '') // Remove interface definitions
        .replace(/^type.*?;$/gm, '') // Remove type definitions
        .trim();

      // Find the actual data object (should start with { and end with })
      const dataMatch = cleanContent.match(/(\{[\s\S]*\})/);
      if (!dataMatch) {
        throw new Error('Could not find data object in file');
      }

      // Parse the JSON-like object
      const dataString = dataMatch[1];
      
      // Convert JavaScript object notation to valid JSON
      const jsonString = dataString
        .replace(/(\w+):/g, '"$1":') // Add quotes around property names
        .replace(/'/g, '"') // Convert single quotes to double quotes
        .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

      const parsedData = JSON.parse(jsonString);
      
      // Validate the structure
      if (!parsedData.navigation || !Array.isArray(parsedData.navigation)) {
        throw new Error('Invalid menu data structure');
      }

      return parsedData as MenuData;
    } catch (error) {
      console.error('Error parsing menuData.ts file:', error);
      console.log('File content:', fileContent);
      throw new Error('Failed to parse menu data file');
    }
  }

  /**
   * Alternative parsing method using dynamic import simulation
   */
  private async parseMenuDataWithEval(fileContent: string): Promise<MenuData> {
    try {
      // Create a safe evaluation context
      const moduleCode = fileContent.replace('export const menuData =', 'const menuData =');
      
      // Use Function constructor for safer evaluation than eval
      const func = new Function(`
        ${moduleCode}
        return menuData;
      `);
      
      const result = func();
      
      if (!result || !result.navigation) {
        throw new Error('Invalid menu data structure');
      }
      
      return result as MenuData;
    } catch (error) {
      console.error('Error evaluating menuData.ts file:', error);
      throw error;
    }
  }

  /**
   * Fallback menu data when SharePoint is unavailable
   */
  private getFallbackMenuData(): MenuData {
    return {
      navigation: [
        {
          title: "My Sites",
          href: "",
          megaMenu: {
            columns: [
              {
                title: "",
                items: [
                  { title: "Academic Affairs Staff Workspace", href: "/sites/academicaffairsworkspace" },
                  { title: "Forms Central", href: "/sites/formscentral" },
                  { title: "Student Resources", href: "/sites/studentresources" }
                ]
              }
            ]
          }
        },
        {
          title: "Forms Central",
          href: "/sites/formscentral"
        },
        {
          title: "Library",
          href: "https://library.law.fordham.edu/"
        },
        {
          title: "IT Support Portal",
          href: "https://fordhamlaw.freshservice.com/support/home"
        }
      ]
    };
  }

  /**
   * Caches menu data in localStorage with expiration
   */
  private cacheMenuData(data: MenuData): void {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (30 * 60 * 1000) // 30 minutes cache
    };
    
    try {
      localStorage.setItem('menuDataFromFile', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache menu data:', error);
    }
  }

  /**
   * Retrieves cached menu data if still valid
   */
  private getCachedMenuData(): MenuData | null {
    try {
      const cached = localStorage.getItem('menuDataFromFile');
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem('menuDataFromFile');
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached menu data:', error);
      return null;
    }
  }

  /**
   * Gets menu data with caching support
   */
  async getMenuData(): Promise<MenuData> {
    // Try cache first
    const cached = this.getCachedMenuData();
    if (cached) {
      return cached;
    }

    // Try primary method first
    try {
      const data = await this.fetchMenuDataFile();
      this.cacheMenuData(data);
      return data;
    } catch (error) {
      console.warn('Primary fetch method failed, trying alternative:', error);
      
      // Try alternative method
      try {
        const data = await this.fetchMenuDataFileAlternative();
        this.cacheMenuData(data);
        return data;
      } catch (alternativeError) {
        console.error('Both fetch methods failed:', alternativeError);
        
        // Return fallback data
        const fallbackData = this.getFallbackMenuData();
        return fallbackData;
      }
    }
  }

  /**
   * Uploads a new version of menuData.ts to SharePoint
   * This method can be used by administrators to update the menu
   */
  async uploadMenuDataFile(menuData: MenuData): Promise<boolean> {
    try {
      // Convert menu data back to TypeScript file format
      const fileContent = this.generateMenuDataFileContent(menuData);
      
      // SharePoint REST API endpoint for file upload
      const endpoint = `${this.baseUrl}/_api/web/GetFolderByServerRelativeUrl('/${this.documentLibrary}')/Files/Add(url='${this.fileName}',overwrite=true)`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': await this.getRequestDigest(),
        },
        body: fileContent,
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      // Clear cache after successful upload
      localStorage.removeItem('menuDataFromFile');
      
      return true;
    } catch (error) {
      console.error('Error uploading menuData.ts to SharePoint:', error);
      return false;
    }
  }

  /**
   * Gets SharePoint request digest for authenticated operations
   */
  private async getRequestDigest(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/_api/contextinfo`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
      },
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error('Failed to get request digest');
    }

    const data = await response.json();
    return data.d.GetContextWebInformation.FormDigestValue;
  }

  /**
   * Generates TypeScript file content from menu data
   */
  private generateMenuDataFileContent(menuData: MenuData): string {
    const jsonString = JSON.stringify(menuData, null, 4);
    
    return `export const menuData = ${jsonString};`;
  }
}

export const sharepointDocumentService = new SharePointDocumentService();
export type { MenuData, NavigationItem, MegaMenuData, MenuColumn, MenuItem };