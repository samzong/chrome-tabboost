import splitViewCore from "./splitView/splitViewCore.js";
import { canLoadInIframe } from "../utils/iframe-compatibility.js";

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
