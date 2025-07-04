interface SharePointListItem {
  Id: number;
  Title: string;
  MenuTitle: string;
  MenuHref: string;
  ParentMenuId?: number;
  MenuOrder: number;
  HasMegaMenu: boolean;
  ColumnTitle?: string;
  ColumnOrder?: number;
  IsActive: boolean;
}

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

class SharePointService {
  private baseUrl: string;
  private listName: string;

  constructor() {
    // These would typically come from environment variables or configuration
    this.baseUrl = window.location.origin; // Current SharePoint site
    this.listName = 'MenuConfiguration'; // SharePoint list name
  }

  /**
   * Fetches menu data from SharePoint document library/list
   */
  async fetchMenuData(): Promise<MenuData> {
    try {
      // SharePoint REST API endpoint
      const endpoint = `${this.baseUrl}/_api/web/lists/getbytitle('${this.listName}')/items?$select=Id,Title,MenuTitle,MenuHref,ParentMenuId,MenuOrder,HasMegaMenu,ColumnTitle,ColumnOrder,IsActive&$filter=IsActive eq true&$orderby=MenuOrder,ColumnOrder`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
        },
        credentials: 'same-origin' // Important for SharePoint authentication
      });

      if (!response.ok) {
        throw new Error(`SharePoint API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items: SharePointListItem[] = data.d.results;

      return this.transformSharePointDataToMenuData(items);
    } catch (error) {
      console.error('Error fetching menu data from SharePoint:', error);
      // Fallback to local data if SharePoint is unavailable
      return this.getFallbackMenuData();
    }
  }

  /**
   * Transforms SharePoint list items into the expected menu data structure
   */
  private transformSharePointDataToMenuData(items: SharePointListItem[]): MenuData {
    const navigation: NavigationItem[] = [];

    // Group items by parent menu (top-level items have no ParentMenuId)
    const topLevelItems = items.filter(item => !item.ParentMenuId);
    
    topLevelItems.forEach(topItem => {
      const navItem: NavigationItem = {
        title: topItem.MenuTitle,
        href: topItem.MenuHref || ''
      };

      if (topItem.HasMegaMenu) {
        // Find all child items for this top-level menu
        const childItems = items.filter(item => item.ParentMenuId === topItem.Id);
        
        // Group child items by column
        const columnMap = new Map<string, MenuItem[]>();
        
        childItems.forEach(child => {
          const columnTitle = child.ColumnTitle || '';
          if (!columnMap.has(columnTitle)) {
            columnMap.set(columnTitle, []);
          }
          
          columnMap.get(columnTitle)!.push({
            title: child.MenuTitle,
            href: child.MenuHref || ''
          });
        });

        // Convert map to columns array
        const columns: MenuColumn[] = Array.from(columnMap.entries()).map(([title, items]) => ({
          title,
          items: items.sort((a, b) => a.title.localeCompare(b.title))
        }));

        navItem.megaMenu = { columns };
      }

      navigation.push(navItem);
    });

    return { navigation };
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
      localStorage.setItem('menuData', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache menu data:', error);
    }
  }

  /**
   * Retrieves cached menu data if still valid
   */
  private getCachedMenuData(): MenuData | null {
    try {
      const cached = localStorage.getItem('menuData');
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem('menuData');
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

    // Fetch fresh data
    const data = await this.fetchMenuData();
    this.cacheMenuData(data);
    return data;
  }
}

export const sharepointService = new SharePointService();
export type { MenuData, NavigationItem, MegaMenuData, MenuColumn, MenuItem };