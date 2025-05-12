import * as i18n from "../../utils/i18n.js";

export const UI_CONFIG = {
  container: {
    id: 'tabboost-split-view-container',
    styles: {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '10000',
      backgroundColor: '#fff',
      display: 'flex',
      overflow: 'hidden'
    }
  },
  viewsContainer: {
    id: 'tabboost-views-container',
    styles: {
      display: 'flex',
      width: '100%',
      height: '100%',
      position: 'relative',
      padding: '12px',
      boxSizing: 'border-box'
    }
  },
  view: {
    styles: {
      width: '50%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
    },
    left: {
      id: 'tabboost-split-left',
      marginRight: '6px'
    },
    right: {
      id: 'tabboost-split-right',
      marginLeft: '6px'
    }
  },
  iframe: {
    styles: {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      borderRadius: '8px'
    },
    attributes: {
      loading: 'lazy',
      sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
      allowfullscreen: 'true'
    },
    left: {
      id: 'tabboost-left-iframe'
    },
    right: {
      id: 'tabboost-right-iframe'
    }
  },
  closeButton: {
    className: 'tabboost-view-close',
    styles: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      zIndex: '10',
      width: '24px',
      height: '24px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      color: '#fff',
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer'
    }
  },
  settingsButton: {
    className: 'tabboost-view-settings',
    styles: {
      position: 'absolute',
      top: '8px',
      right: '40px',
      zIndex: '10',
      width: '24px',
      height: '24px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      opacity: '0',
      transition: 'opacity 0.2s'
    }
  },
  ratioMenu: {
    className: 'tabboost-ratio-menu',
    styles: {
      position: 'absolute',
      top: '35px',
      right: '40px',
      backgroundColor: '#ffffff',
      border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: '100',
      display: 'none',
      padding: '6px 0',
      minWidth: '160px'
    },
    menuItem: {
      styles: {
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderRadius: '4px',
        transition: 'background-color 0.2s'
      }
    },
    iconContainer: {
      styles: {
        width: '20px',
        height: '20px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '3px'
      }
    },
    label: {
      styles: {
        fontSize: '13px',
        color: '#333333'
      }
    }
  }
};

export const LAYOUT_CONFIG = {
  horizontal: {
    flexDirection: 'row',
    leftWidth: '50%',
    leftHeight: '100%',
    rightWidth: '50%',
    rightHeight: '100%'
  },
  vertical: {
    flexDirection: 'column',
    leftWidth: '100%',
    leftHeight: '50%',
    rightWidth: '100%',
    rightHeight: '50%'
  },
  ratioPresets: [
    { left: 50, right: 50, top: 50, bottom: 50, label: i18n.getMessage("splitViewEqualRatio") },
    { left: 70, right: 30, top: 70, bottom: 30, label: i18n.getMessage("splitViewLeftLarger") },
    { left: 30, right: 70, top: 30, bottom: 70, label: i18n.getMessage("splitViewRightLarger") }
  ]
};

export const RESPONSIVE_CONFIG = {
  breakpoint: 768,
  styles: {
    viewsContainer: {
      flexDirection: 'column',
      padding: '8px'
    },
    view: {
      width: '100%',
      height: 'calc(50% - 12px)'
    },
    divider: {
      width: '100%',
      height: '24px',
      top: '50%',
      left: '0',
      transform: 'translateY(-50%)',
      cursor: 'row-resize',
      line: {
        width: '40px',
        height: '4px'
      }
    }
  }
};

export const ANIMATION_CONFIG = {
  duration: 300,
  initialClass: 'tabboost-initially-hidden',
  visibleClass: 'tabboost-visible'
};

export const DRAG_CONFIG = {
  minWidth: 20,
  maxWidth: 80,
  debounceTime: 16 
};

export const SVG_CONFIG = {
  horizontal: '<svg viewBox="0 0 20 20" width="20" height="20"><rect x="1" y="3" width="8" height="14" fill="#e0e0e0" rx="2"/><rect x="11" y="3" width="8" height="14" fill="#e0e0e0" rx="2"/></svg>',
  vertical: '<svg viewBox="0 0 20 20" width="20" height="20"><rect x="1" y="1" width="18" height="8" fill="#e0e0e0" rx="2"/><rect x="1" y="11" width="18" height="8" fill="#e0e0e0" rx="2"/></svg>',
  horizontalRatio: (leftWidth, rightWidth) => `<svg viewBox="0 0 20 20" width="20" height="20">
    <rect x="1" y="3" width="${leftWidth/100 * 17}" height="14" fill="#e0e0e0" rx="2"/>
    <rect x="${2 + leftWidth/100 * 17}" y="3" width="${rightWidth/100 * 17}" height="14" fill="#e0e0e0" rx="2"/>
  </svg>`,
  verticalRatio: (topHeight, bottomHeight) => `<svg viewBox="0 0 20 20" width="20" height="20">
    <rect x="1" y="1" width="18" height="${topHeight/100 * 17}" fill="#e0e0e0" rx="2"/>
    <rect x="1" y="${2 + topHeight/100 * 17}" width="18" height="${bottomHeight/100 * 17}" fill="#e0e0e0" rx="2"/>
  </svg>`
} 