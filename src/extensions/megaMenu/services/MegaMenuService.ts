import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

export interface MenuItem {
  title: string;
  href: string;
}

export interface MenuColumn {
  title: string;
  items: MenuItem[];
}

export interface MegaMenuData {
  columns: MenuColumn[];
}

export interface NavigationItem {
  title: string;
  href: string;
  megaMenu?: MegaMenuData;
}

export interface MenuData {
  navigation: NavigationItem[];
}

export class MegaMenuService {
  private spHttpClient: SPHttpClient;
  private baseUrl: string;
  private documentLibrary: string;
  private fileName: string;
  private cacheKey: string = 'spfx-mega-menu-data';
  private cacheExpiry: number = 30 * 60 * 1000; // 30 minutes

  constructor(
    spHttpClient: SPHttpClient,
    baseUrl: string,
    documentLibrary: string = 'Shared Documents',
    fileName: string = 'menuData.ts'
  ) {
    this.spHttpClient = spHttpClient;
    this.baseUrl = baseUrl;
    this.documentLibrary = documentLibrary;
    this.fileName = fileName;
  }

  public async getMenuData(): Promise<MenuData> {
    // Try cache first
    const cached = this.getCachedMenuData();
    if (cached) {
      console.log('Using cached menu data');
      return cached;
    }

    try {
      console.log(`Fetching menu data from: ${this.documentLibrary}/${this.fileName}`);
      
      // Try primary method first
      const data = await this.fetchMenuDataFile();
      this.cacheMenuData(data);
      console.log('Successfully fetched and cached menu data');
      return data;
    } catch (error) {
      console.warn('Primary fetch method failed, trying alternative:', error);
      
      try {
        // Try alternative method
        const data = await this.fetchMenuDataFileAlternative();
        this.cacheMenuData(data);
        console.log('Successfully fetched menu data using alternative method');
        return data;
      } catch (alternativeError) {
        console.error('Both fetch methods failed:', alternativeError);
        
        // Return fallback data
        console.log('Using fallback menu data');
        return this.getFallbackMenuData();
      }
    }
  }

  private async fetchMenuDataFile(): Promise<MenuData> {
    // Construct the SharePoint REST API endpoint to get file content
    const endpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')/$value`;
    
    console.log('Fetching from endpoint:', endpoint);

    const response: SPHttpClientResponse = await this.spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`SharePoint Document Library error: ${response.status} ${response.statusText}`);
    }

    const fileContent = await response.text();
    console.log('Raw file content received:', fileContent.substring(0, 200) + '...');
    
    return this.parseMenuDataFromFile(fileContent);
  }

  private async fetchMenuDataFileAlternative(): Promise<MenuData> {
    // Alternative method: Get file information first, then content
    const fileInfoEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')`;
    
    console.log('Getting file info from:', fileInfoEndpoint);
    
    const fileInfoResponse: SPHttpClientResponse = await this.spHttpClient.get(
      fileInfoEndpoint,
      SPHttpClient.configurations.v1
    );

    if (!fileInfoResponse.ok) {
      throw new Error(`File not found: ${fileInfoResponse.status} ${fileInfoResponse.statusText}`);
    }

    const fileInfo = await fileInfoResponse.json();
    console.log('File info received:', fileInfo);

    // Get file content using the server relative URL
    const contentEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('${fileInfo.ServerRelativeUrl}')/$value`;
    
    console.log('Getting file content from:', contentEndpoint);
    
    const contentResponse: SPHttpClientResponse = await this.spHttpClient.get(
      contentEndpoint,
      SPHttpClient.configurations.v1
    );

    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch file content: ${contentResponse.status} ${contentResponse.statusText}`);
    }

    const fileContent = await contentResponse.text();
    console.log('File content received via alternative method');
    
    return this.parseMenuDataFromFile(fileContent);
  }

  private parseMenuDataFromFile(fileContent: string): MenuData {
    try {
      console.log('Parsing menuData.ts file content...');
      
      // Clean up the TypeScript file content
      let cleanContent = fileContent.trim();
      
      // Remove comments (both single-line and multi-line)
      cleanContent = cleanContent
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, ''); // Remove // comments
      
      // Remove import statements
      cleanContent = cleanContent.replace(/^import.*?;?\s*$/gm, '');
      
      // Remove interface and type definitions
      cleanContent = cleanContent.replace(/^(export\s+)?(interface|type)\s+\w+.*?(?=^(export|interface|type|\w+\s*[=:])|$)/gms, '');
      
      // Find the export const menuData declaration
      const exportMatch = cleanContent.match(/export\s+const\s+menuData\s*=\s*([\s\S]*?)(?:;?\s*$)/m);
      
      if (!exportMatch) {
        throw new Error('Could not find "export const menuData" declaration in file');
      }
      
      let dataString = exportMatch[1].trim();
      
      // Remove trailing semicolon if present
      dataString = dataString.replace(/;$/, '');
      
      console.log('Extracted data string:', dataString.substring(0, 200) + '...');
      
      // Convert TypeScript/JavaScript object notation to valid JSON
      const jsonString = this.convertToValidJSON(dataString);
      
      console.log('Converted to JSON format');
      
      // Parse the JSON
      const parsedData = JSON.parse(jsonString);
      
      // Validate the structure
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Parsed data is not a valid object');
      }
      
      if (!parsedData.navigation || !Array.isArray(parsedData.navigation)) {
        throw new Error('Invalid menu data structure: missing or invalid navigation array');
      }
      
      console.log('Successfully parsed menu data with', parsedData.navigation.length, 'navigation items');
      
      return parsedData as MenuData;
      
    } catch (error) {
      console.error('Error parsing menuData.ts file:', error);
      console.log('Full file content for debugging:', fileContent);
      throw new Error(`Failed to parse menu data file: ${error.message}`);
    }
  }

  private convertToValidJSON(dataString: string): string {
    // Handle object property names (add quotes if not already quoted)
    let jsonString = dataString.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    // Convert single quotes to double quotes, but be careful with escaped quotes
    jsonString = jsonString.replace(/'/g, '"');
    
    // Handle trailing commas (remove them)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Handle functions or undefined values (replace with null)
    jsonString = jsonString.replace(/:\s*undefined\b/g, ': null');
    
    // Handle boolean values (ensure they're lowercase)
    jsonString = jsonString.replace(/:\s*True\b/g, ': true');
    jsonString = jsonString.replace(/:\s*False\b/g, ': false');
    
    return jsonString;
  }

  private getFallbackMenuData(): MenuData {
    return {
      navigation: [
        {
          title: "My Sites",
          href: "",
          megaMenu: {
            columns: [
              {
                title: "Workspaces",
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

  private cacheMenuData(data: MenuData): void {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.cacheExpiry
    };
    
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log('Menu data cached successfully');
    } catch (error) {
      console.warn('Failed to cache menu data:', error);
    }
  }

  private getCachedMenuData(): MenuData | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) {
        console.log('No cached menu data found');
        return null;
      }

      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(this.cacheKey);
        console.log('Cached menu data expired, removed from cache');
        return null;
      }

      console.log('Found valid cached menu data');
      return cacheData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached menu data:', error);
      localStorage.removeItem(this.cacheKey); // Clean up corrupted cache
      return null;
    }
  }
}