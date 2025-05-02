import splitViewCore from "./splitView/splitViewCore.js";
import { canLoadInIframe } from "./splitView/splitViewURLValidator.js";

export const {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState,
} = splitViewCore;

export { canLoadInIframe };

splitViewCore.initSplitViewModule();

export default splitViewCore;
