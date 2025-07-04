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
      return cached;
    }

    try {
      // Try primary method first
      const data = await this.fetchMenuDataFile();
      this.cacheMenuData(data);
      return data;
    } catch (error) {
      console.warn('Primary fetch method failed, trying alternative:', error);
      
      try {
        // Try alternative method
        const data = await this.fetchMenuDataFileAlternative();
        this.cacheMenuData(data);
        return data;
      } catch (alternativeError) {
        console.error('Both fetch methods failed:', alternativeError);
        
        // Return fallback data
        return this.getFallbackMenuData();
      }
    }
  }

  private async fetchMenuDataFile(): Promise<MenuData> {
    const endpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')/$value`;

    const response: SPHttpClientResponse = await this.spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`SharePoint Document Library error: ${response.status} ${response.statusText}`);
    }

    const fileContent = await response.text();
    return this.parseMenuDataFromFile(fileContent);
  }

  private async fetchMenuDataFileAlternative(): Promise<MenuData> {
    // Get file information first
    const fileInfoEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')`;
    
    const fileInfoResponse: SPHttpClientResponse = await this.spHttpClient.get(
      fileInfoEndpoint,
      SPHttpClient.configurations.v1
    );

    if (!fileInfoResponse.ok) {
      throw new Error(`File not found: ${fileInfoResponse.status}`);
    }

    // Get file content
    const contentEndpoint = `${this.baseUrl}/_api/web/GetFileByServerRelativeUrl('/${this.documentLibrary}/${this.fileName}')/$value`;
    
    const contentResponse: SPHttpClientResponse = await this.spHttpClient.get(
      contentEndpoint,
      SPHttpClient.configurations.v1
    );

    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch file content: ${contentResponse.status}`);
    }

    const fileContent = await contentResponse.text();
    return this.parseMenuDataFromFile(fileContent);
  }

  private parseMenuDataFromFile(fileContent: string): MenuData {
    try {
      // Remove TypeScript syntax and extract the data object
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

  private cacheMenuData(data: MenuData): void {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.cacheExpiry
    };
    
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache menu data:', error);
    }
  }

  private getCachedMenuData(): MenuData | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached menu data:', error);
      return null;
    }
  }
}