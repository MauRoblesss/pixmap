const initialState = {
  showGrid: false,
  showPixelNotify: false,
  autoZoomIn: false,
  isPotato: false,
  isLightGrid: false,
  compactPalette: false,
  paletteOpen: true,
  mute: false,
  chatNotify: true,
  // top-left button menu
  menuOpen: false,
  // show online users per canvas instead of total
  onlineCanvas: false,
  // selected theme
  style: 'default',
  // pencil
  pencilTool: false,
};


export default function gui(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 's/TGL_GRID': {
      return {
        ...state,
        showGrid: !state.showGrid,
      };
    }

    case 's/TGL_PXL_NOTIFY': {
      return {
        ...state,
        showPixelNotify: !state.showPixelNotify,
      };
    }

    case 's/TGL_AUTO_ZOOM_IN': {
      return {
        ...state,
        autoZoomIn: !state.autoZoomIn,
      };
    }

    case 's/TGL_ONLINE_CANVAS': {
      return {
        ...state,
        onlineCanvas: !state.onlineCanvas,
      };
    }

    case 's/TGL_POTATO_MODE': {
      return {
        ...state,
        isPotato: !state.isPotato,
      };
    }

    case 's/TGL_LIGHT_GRID': {
      return {
        ...state,
        isLightGrid: !state.isLightGrid,
      };
    }

    case 's/TGL_COMPACT_PALETTE': {
      return {
        ...state,
        compactPalette: !state.compactPalette,
      };
    }

    case 's/TGL_OPEN_PALETTE': {
      return {
        ...state,
        paletteOpen: !state.paletteOpen,
      };
    }

    case 's/TGL_OPEN_MENU': {
      return {
        ...state,
        menuOpen: !state.menuOpen,
      };
    }

    case 's/SELECT_STYLE': {
      const { style } = action;
      return {
        ...state,
        style,
      };
    }

    case 'SELECT_COLOR': {
      const {
        compactPalette,
      } = state;
      let {
        paletteOpen,
      } = state;
      if (compactPalette || window.innerWidth < 300) {
        paletteOpen = false;
      }
      return {
        ...state,
        paletteOpen,
      };
    }

    case 's/TGL_MUTE':
      return {
        ...state,
        mute: !state.mute,
      };

    case 's/TGL_CHAT_NOTIFY':
      return {
        ...state,
        chatNotify: !state.chatNotify,
      };

    case 's/TGL_PENCILTOOL':
      return {
        ...state,
        pencilTool: !state.pencilTool,
      };

    default:
      return state;
  }
}
