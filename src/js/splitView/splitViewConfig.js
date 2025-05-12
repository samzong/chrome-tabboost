// UI组件基础配置
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
  }
};

// 响应式配置
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

// 动画配置
export const ANIMATION_CONFIG = {
  duration: 300,
  initialClass: 'tabboost-initially-hidden',
  visibleClass: 'tabboost-visible'
};

// 拖拽配置
export const DRAG_CONFIG = {
  minWidth: 20,
  maxWidth: 80,
  debounceTime: 16 // ~60fps
}; 