import { override } from '@microsoft/decorators';
import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer,
  PlaceholderContent,
  PlaceholderName
} from '@microsoft/sp-application-base';
import { Dialog } from '@microsoft/sp-dialog';

import * as strings from 'MegaMenuApplicationCustomizerStrings';
import { MegaMenuService } from './services/MegaMenuService';
import { IMegaMenuProps } from './components/MegaMenu';

const LOG_SOURCE: string = 'MegaMenuApplicationCustomizer';

export interface IMegaMenuApplicationCustomizerProperties {
  testMessage: string;
  documentLibrary?: string;
  fileName?: string;
}

export default class MegaMenuApplicationCustomizer
  extends BaseApplicationCustomizer<IMegaMenuApplicationCustomizerProperties> {

  private _topPlaceholder: PlaceholderContent | undefined;
  private _megaMenuService: MegaMenuService;

  @override
  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);

    // Initialize the mega menu service
    this._megaMenuService = new MegaMenuService(
      this.context.spHttpClient,
      this.context.pageContext.web.absoluteUrl,
      this.properties.documentLibrary || 'Shared Documents',
      this.properties.fileName || 'menuData.ts'
    );

    // Call render method for generating the HTML elements
    this._renderPlaceHolders();

    return Promise.resolve();
  }

  private _renderPlaceHolders(): void {
    console.log('Available placeholders: ',
      this.context.placeholderProvider.placeholderNames.map(name => PlaceholderName[name]).join(', '));

    // Handling the top placeholder
    if (!this._topPlaceholder) {
      this._topPlaceholder =
        this.context.placeholderProvider.tryCreateContent(
          PlaceholderName.Top,
          { onDispose: this._onDispose }
        );

      // The extension should not assume that the expected placeholder is available.
      if (!this._topPlaceholder) {
        console.error('The expected placeholder (Top) was not found.');
        return;
      }

      if (this._topPlaceholder.domElement) {
        this._renderMegaMenu();
      }
    }
  }

  private _renderMegaMenu(): void {
    if (!this._topPlaceholder || !this._topPlaceholder.domElement) {
      return;
    }

    // Create the mega menu container
    const megaMenuContainer = document.createElement('div');
    megaMenuContainer.id = 'mega-menu-container';
    
    // Add CSS styles
    this._addStyles();
    
    // Load menu data and render
    this._megaMenuService.getMenuData()
      .then(menuData => {
        this._renderMegaMenuHTML(megaMenuContainer, menuData);
        this._topPlaceholder!.domElement.appendChild(megaMenuContainer);
      })
      .catch(error => {
        console.error('Error loading menu data:', error);
        // Render fallback menu
        this._renderFallbackMenu(megaMenuContainer);
        this._topPlaceholder!.domElement.appendChild(megaMenuContainer);
      });
  }

  private _renderMegaMenuHTML(container: HTMLElement, menuData: any): void {
    const navigation = menuData.navigation || [];
    
    container.innerHTML = `
      <nav class="mega-menu">
        <div class="mega-menu-container">
          <div class="mega-menu-header">
            <!-- Desktop Navigation -->
            <div class="desktop-nav">
              ${navigation.map((item: any) => `
                <div class="nav-item" data-menu="${item.title}">
                  ${item.megaMenu ? `
                    <button class="nav-button">
                      <span>${item.title}</span>
                      <span class="chevron">▼</span>
                    </button>
                  ` : `
                    <a href="${item.href}" class="nav-link">
                      <span>${item.title}</span>
                    </a>
                  `}
                </div>
              `).join('')}
            </div>
            
            <!-- Mobile Menu Button -->
            <div class="mobile-menu-button">
              <button class="hamburger" aria-label="Main menu">
                ☰
              </button>
            </div>
          </div>
          
          <!-- Desktop Mega Menu Dropdowns -->
          ${navigation.map((item: any) => {
            if (!item.megaMenu) return '';
            return `
              <div class="mega-menu-dropdown" data-menu="${item.title}" style="display: none;">
                <div class="dropdown-content">
                  <div class="columns-grid">
                    ${item.megaMenu.columns.map((column: any) => `
                      <div class="column">
                        <h3 class="column-title">${column.title}</h3>
                        <ul class="column-list">
                          ${column.items.map((menuItem: any) => `
                            <li>
                              <a href="${menuItem.href}" class="column-link">
                                ${menuItem.title}
                              </a>
                            </li>
                          `).join('')}
                        </ul>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Mobile Menu -->
        <div class="mobile-menu" style="display: none;">
          <div class="mobile-menu-content">
            ${navigation.map((item: any) => `
              <div>
                ${item.megaMenu ? `
                  <button class="mobile-nav-button" data-submenu="${item.title}">
                    <span>${item.title}</span>
                    <span class="mobile-chevron">▼</span>
                  </button>
                  <div class="mobile-submenu" data-submenu="${item.title}" style="display: none;">
                    ${item.megaMenu.columns.map((column: any) => `
                      <div class="mobile-column">
                        <h4 class="mobile-column-title">${column.title}</h4>
                        ${column.items.map((menuItem: any) => `
                          <a href="${menuItem.href}" class="mobile-column-link">
                            ${menuItem.title}
                          </a>
                        `).join('')}
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <a href="${item.href}" class="mobile-nav-link">
                    ${item.title}
                  </a>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      </nav>
    `;

    // Add event listeners
    this._addEventListeners(container);
  }

  private _renderFallbackMenu(container: HTMLElement): void {
    const fallbackData = {
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

    this._renderMegaMenuHTML(container, fallbackData);
  }

  private _addEventListeners(container: HTMLElement): void {
    let activeMenu: string | null = null;
    let timeoutRef: number | null = null;

    // Desktop menu hover events
    const navItems = container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const menuName = item.getAttribute('data-menu');
      const dropdown = container.querySelector(`.mega-menu-dropdown[data-menu="${menuName}"]`) as HTMLElement;
      
      if (dropdown) {
        item.addEventListener('mouseenter', () => {
          if (timeoutRef) {
            clearTimeout(timeoutRef);
          }
          
          // Hide all dropdowns
          const allDropdowns = container.querySelectorAll('.mega-menu-dropdown');
          allDropdowns.forEach(dd => (dd as HTMLElement).style.display = 'none');
          
          // Show current dropdown
          dropdown.style.display = 'block';
          activeMenu = menuName;
        });

        item.addEventListener('mouseleave', () => {
          timeoutRef = window.setTimeout(() => {
            dropdown.style.display = 'none';
            activeMenu = null;
          }, 150);
        });

        dropdown.addEventListener('mouseenter', () => {
          if (timeoutRef) {
            clearTimeout(timeoutRef);
          }
        });

        dropdown.addEventListener('mouseleave', () => {
          dropdown.style.display = 'none';
          activeMenu = null;
        });
      }
    });

    // Mobile menu toggle
    const hamburger = container.querySelector('.hamburger');
    const mobileMenu = container.querySelector('.mobile-menu') as HTMLElement;
    let isMobileMenuOpen = false;

    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        isMobileMenuOpen = !isMobileMenuOpen;
        mobileMenu.style.display = isMobileMenuOpen ? 'block' : 'none';
        hamburger.textContent = isMobileMenuOpen ? '✕' : '☰';
      });
    }

    // Mobile submenu toggles
    const mobileNavButtons = container.querySelectorAll('.mobile-nav-button');
    mobileNavButtons.forEach(button => {
      button.addEventListener('click', () => {
        const submenuName = button.getAttribute('data-submenu');
        const submenu = container.querySelector(`.mobile-submenu[data-submenu="${submenuName}"]`) as HTMLElement;
        const chevron = button.querySelector('.mobile-chevron') as HTMLElement;
        
        if (submenu) {
          const isOpen = submenu.style.display === 'block';
          submenu.style.display = isOpen ? 'none' : 'block';
          chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      });
    });
  }

  private _addStyles(): void {
    if (document.getElementById('mega-menu-styles')) {
      return; // Styles already added
    }

    const style = document.createElement('style');
    style.id = 'mega-menu-styles';
    style.textContent = `
      .mega-menu {
        position: relative;
        background-color: #b91c1c;
        color: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
      }

      .mega-menu-container {
        max-width: 1280px;
        margin: 0 auto;
      }

      .mega-menu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 64px;
        padding: 0 30px;
      }

      .desktop-nav {
        display: none;
        align-items: center;
        gap: 16px;
      }

      @media (min-width: 768px) {
        .desktop-nav {
          display: flex;
        }
      }

      .nav-item {
        position: relative;
      }

      .nav-button, .nav-link {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 500;
        color: white;
        background: none;
        border: none;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
        border-radius: 6px;
        text-decoration: none;
      }

      .nav-button:hover, .nav-link:hover {
        background-color: #991b1b;
        color: #fecaca;
      }

      .chevron {
        font-size: 12px;
        transition: transform 0.2s ease;
      }

      .mobile-menu-button {
        display: block;
      }

      @media (min-width: 768px) {
        .mobile-menu-button {
          display: none;
        }
      }

      .hamburger {
        padding: 8px;
        color: white;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 20px;
        transition: color 0.2s ease;
        border-radius: 6px;
      }

      .hamburger:hover {
        color: #fecaca;
      }

      .mega-menu-dropdown {
        position: absolute;
        top: 64px;
        left: 0;
        right: 0;
        background-color: white;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border-top: 1px solid #e5e7eb;
        border-bottom: 3px solid #dc2626;
        z-index: 40;
        max-height: 75vh;
        overflow-y: auto;
      }

      .dropdown-content {
        max-width: 1280px;
        margin: 0 auto;
        padding: 24px 30px;
      }

      .columns-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;
      }

      .column {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .column-title {
        font-size: 15px;
        font-weight: 600;
        color: #b91c1c;
        border-bottom: 1px solid #fecaca;
        padding-bottom: 6px;
        margin: 0 0 8px 0;
      }

      .column-title:empty {
        display: none;
      }

      .column-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .column-link {
        display: block;
        color: #b91c1c;
        text-decoration: none;
        padding: 3px 6px;
        border-radius: 3px;
        font-size: 13px;
        line-height: 1.4;
        transition: all 0.2s ease;
      }

      .column-link:hover {
        color: #b91c1c;
        background-color: #fef2f2;
      }

      .mobile-menu {
        background-color: #7f1d1d;
        border-top: 1px solid #991b1b;
      }

      @media (min-width: 768px) {
        .mobile-menu {
          display: none !important;
        }
      }

      .mobile-menu-content {
        padding: 8px 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 384px;
        overflow-y: auto;
      }

      .mobile-nav-button, .mobile-nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 12px;
        font-size: 16px;
        font-weight: 500;
        color: white;
        background: none;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 6px;
        text-decoration: none;
      }

      .mobile-nav-button:hover, .mobile-nav-link:hover {
        color: #fecaca;
        background-color: #991b1b;
      }

      .mobile-chevron {
        font-size: 12px;
        transition: transform 0.2s ease;
      }

      .mobile-submenu {
        margin-top: 8px;
        margin-left: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mobile-column {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mobile-column-title {
        font-size: 14px;
        font-weight: 600;
        color: #fecaca;
        padding: 4px 12px;
        margin: 0;
      }

      .mobile-column-title:empty {
        display: none;
      }

      .mobile-column-link {
        display: block;
        padding: 8px 24px;
        font-size: 14px;
        color: white;
        text-decoration: none;
        transition: all 0.2s ease;
        border-radius: 6px;
      }

      .mobile-column-link:hover {
        color: #fecaca;
        background-color: #991b1b;
      }
    `;

    document.head.appendChild(style);
  }

  private _onDispose(): void {
    console.log('[MegaMenuApplicationCustomizer._onDispose] Disposed custom top placeholder.');
  }
}