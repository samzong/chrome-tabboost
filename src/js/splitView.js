import splitViewCore from "./splitView/splitViewCore.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";

export const {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState,
  querySplitViewStatus,
} = splitViewCore;

export { canLoadInIframe };

splitViewCore.initSplitViewModule();

export default splitViewCore;
