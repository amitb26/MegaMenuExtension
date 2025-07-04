import * as React from 'react';

export interface IMegaMenuProps {
  menuData: any;
  isDomLoading: boolean;
}

export interface IMegaMenuState {
  activeMenu: string | null;
  isMobileMenuOpen: boolean;
  activeMobileSubmenu: string | null;
}

export class MegaMenu extends React.Component<IMegaMenuProps, IMegaMenuState> {
  private timeoutRef: number | null = null;

  constructor(props: IMegaMenuProps) {
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

  public render(): React.ReactElement<IMegaMenuProps> {
    const { menuData, isDomLoading } = this.props;
    const { activeMenu, isMobileMenuOpen, activeMobileSubmenu } = this.state;

    if (isDomLoading) {
      return (
        <nav className="mega-menu">
          <div className="mega-menu-container">
            <div className="mega-menu-header">
              <div className="desktop-nav">
                <span style={{ color: 'white' }}>Loading menu...</span>
              </div>
              <div className="mobile-menu-button">
                <button className="hamburger" disabled>
                  ☰
                </button>
              </div>
            </div>
          </div>
        </nav>
      );
    }

    if (!menuData || !menuData.navigation) {
      return null;
    }

    const navigation = menuData.navigation;

    return (
      <nav className="mega-menu">
        <div className="mega-menu-container">
          <div className="mega-menu-header">
            {/* Desktop Navigation */}
            <div className="desktop-nav">
              {navigation.map((item: any) => (
                <div
                  key={item.title}
                  className="nav-item"
                  onMouseEnter={() => this.handleMouseEnter(item.title, !!item.megaMenu)}
                  onMouseLeave={this.handleMouseLeave}
                >
                  {item.megaMenu ? (
                    <button className="nav-button">
                      <span>{item.title}</span>
                      <span className="chevron">▼</span>
                    </button>
                  ) : (
                    <a href={item.href} className="nav-link">
                      <span>{item.title}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="mobile-menu-button">
              <button
                onClick={this.toggleMobileMenu}
                className="hamburger"
                aria-label="Main menu"
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>

          {/* Desktop Mega Menu Dropdown */}
          {activeMenu && (
            <div
              className="mega-menu-dropdown"
              onMouseEnter={() => {
                if (this.timeoutRef) {
                  clearTimeout(this.timeoutRef);
                }
              }}
              onMouseLeave={this.handleMouseLeave}
            >
              <div className="dropdown-content">
                {navigation.map((item: any) => {
                  if (item.title === activeMenu && item.megaMenu) {
                    return (
                      <div key={item.title} className="columns-grid">
                        {item.megaMenu.columns.map((column: any, columnIndex: number) => (
                          <div key={columnIndex} className="column">
                            <h3 className="column-title">
                              {column.title}
                            </h3>
                            <ul className="column-list">
                              {column.items.map((menuItem: any, itemIndex: number) => (
                                <li key={itemIndex}>
                                  <a
                                    href={menuItem.href}
                                    className="column-link"
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
          <div className="mobile-menu">
            <div className="mobile-menu-content">
              {navigation.map((item: any) => (
                <div key={item.title}>
                  {item.megaMenu ? (
                    <div>
                      <button
                        onClick={() => this.toggleMobileSubmenu(item.title)}
                        className="mobile-nav-button"
                      >
                        <span>{item.title}</span>
                        <span 
                          className="mobile-chevron"
                          style={{
                            transform: activeMobileSubmenu === item.title ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        >
                          ▼
                        </span>
                      </button>
                      {activeMobileSubmenu === item.title && (
                        <div className="mobile-submenu">
                          {item.megaMenu.columns.map((column: any, columnIndex: number) => (
                            <div key={columnIndex} className="mobile-column">
                              <h4 className="mobile-column-title">
                                {column.title}
                              </h4>
                              {column.items.map((menuItem: any, itemIndex: number) => (
                                <a
                                  key={itemIndex}
                                  href={menuItem.href}
                                  className="mobile-column-link"
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
                      className="mobile-nav-link"
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