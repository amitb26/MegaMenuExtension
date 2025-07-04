import * as React from 'react';
import styles from './MainMenu.module.scss';
import { menuData } from '../data/menuData';

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

export interface IMegaMenuComponentState {
  activeMenu: string | null;
  isMobileMenuOpen: boolean;
  activeMobileSubmenu: string | null;
}

export default class MegaMenuComponent extends React.Component<{}, IMegaMenuComponentState> {
  private timeoutRef: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      activeMenu: null,
      isMobileMenuOpen: false,
      activeMobileSubmenu: null
    };
  }

  private handleMouseEnter = (title: string, hasMegaMenu: boolean): void => {
    if (window.innerWidth >= 768 && hasMegaMenu) {
      if (this.timeoutRef) {
        clearTimeout(this.timeoutRef);
      }
      this.setState({ activeMenu: title });
    }
  }

  private handleMouseLeave = (): void => {
    if (window.innerWidth >= 768) {
      this.timeoutRef = window.setTimeout(() => {
        this.setState({ activeMenu: null });
      }, 150);
    }
  }

  private toggleMobileSubmenu = (title: string): void => {
    this.setState({
      activeMobileSubmenu: this.state.activeMobileSubmenu === title ? null : title
    });
  }

  private toggleMobileMenu = (): void => {
    this.setState({
      isMobileMenuOpen: !this.state.isMobileMenuOpen
    });
  }

  public componentWillUnmount(): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }
  }

  public render(): React.ReactElement<{}> {
    const { activeMenu, isMobileMenuOpen, activeMobileSubmenu } = this.state;
    const navigation = menuData.navigation as NavigationItem[];

    return (
      <nav className={styles.megaMenu}>
        <div className={styles.container}>
          <div className={styles.header}>
            {/* Logo/Brand */}
            <div className={styles.brand}>
              <span className={styles.brandText}>Fordham|LawNET</span>
            </div>

            {/* Desktop Navigation */}
            <div className={styles.desktopNav}>
              {navigation.map((item) => (
                <div
                  key={item.title}
                  className={styles.navItem}
                  onMouseEnter={() => this.handleMouseEnter(item.title, !!item.megaMenu)}
                  onMouseLeave={this.handleMouseLeave}
                >
                  {item.megaMenu ? (
                    <button className={styles.navButton}>
                      <span>{item.title}</span>
                      <span className={styles.chevron}>▼</span>
                    </button>
                  ) : (
                    <a
                      href={item.href}
                      className={styles.navLink}
                    >
                      <span>{item.title}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className={styles.mobileMenuButton}>
              <button
                onClick={this.toggleMobileMenu}
                className={styles.hamburger}
                aria-label="Main menu"
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>

          {/* Desktop Mega Menu Dropdown - Only render when activeMenu exists and has megaMenu */}
          {activeMenu && (
            <div
              className={styles.megaMenuDropdown}
              onMouseEnter={() => {
                if (this.timeoutRef) {
                  clearTimeout(this.timeoutRef);
                }
              }}
              onMouseLeave={this.handleMouseLeave}
            >
              <div className={styles.dropdownContent}>
                {navigation.map((item) => {
                  if (item.title === activeMenu && item.megaMenu) {
                    return (
                      <div key={item.title} className={styles.columnsGrid}>
                        {item.megaMenu.columns.map((column, columnIndex) => (
                          <div key={columnIndex} className={styles.column}>
                            <h3 className={styles.columnTitle}>
                              {column.title}
                            </h3>
                            <ul className={styles.columnList}>
                              {column.items.map((menuItem, itemIndex) => (
                                <li key={itemIndex}>
                                  <a
                                    href={menuItem.href}
                                    className={styles.columnLink}
                                  >
                                    {menuItem.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <div className={styles.mobileMenuContent}>
              {navigation.map((item) => (
                <div key={item.title}>
                  {item.megaMenu ? (
                    <div>
                      <button
                        onClick={() => this.toggleMobileSubmenu(item.title)}
                        className={styles.mobileNavButton}
                      >
                        <span>{item.title}</span>
                        <span className={`${styles.mobileChevron} ${
                          activeMobileSubmenu === item.title ? styles.rotated : ''
                        }`}>
                          ▼
                        </span>
                      </button>
                      {activeMobileSubmenu === item.title && (
                        <div className={styles.mobileSubmenu}>
                          {item.megaMenu.columns.map((column, columnIndex) => (
                            <div key={columnIndex} className={styles.mobileColumn}>
                              <h4 className={styles.mobileColumnTitle}>
                                {column.title}
                              </h4>
                              {column.items.map((menuItem, itemIndex) => (
                                <a
                                  key={itemIndex}
                                  href={menuItem.href}
                                  className={styles.mobileColumnLink}
                                >
                                  {menuItem.title}
                                </a>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      className={styles.mobileNavLink}
                    >
                      {item.title}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>
    );
  }
}