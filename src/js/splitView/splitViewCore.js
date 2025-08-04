import { getCurrentTab } from "../../utils/utils.js";
import storageCache from "../../utils/storage-cache.js";
import { canLoadInIframe } from "../../utils/iframe-compatibility.js";
import * as i18n from "../../utils/i18n.js";
// setupLazyLoading removed - causes issues in injected scripts
import {
  initSplitViewDOM,
  removeSplitViewDOM,
  updateRightViewDOM,
} from "./splitViewDOM.js";
import {
  setupSplitViewEvents,
  cleanupSplitViewEvents,
} from "./splitViewEvents.js";
import splitViewState from "./splitViewState.js";

splitViewState.init().catch((error) => {
  console.error("Failed to initialize split view state:", error);
});

/**
 * 创建分屏视图
 * @returns {Promise<boolean>} - 是否成功创建
 */
export async function createSplitView() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab");
      return false;
    }

    const leftUrl = currentTab.url;

    if (!leftUrl || leftUrl === "about:blank") {
      console.error("Invalid page URL");
      return false;
    }

    splitViewState.activate(leftUrl);

    try {
      const [checkResult] = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          try {
            const container = document.getElementById(
              "tabboost-split-view-container"
            );
            return !!container;
          } catch (e) {
            console.error("Error checking if split view container exists:", e);
            return false;
          }
        },
      });

      if (checkResult && checkResult.result) {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: () => {
            try {
              const container = document.getElementById(
                "tabboost-split-view-container"
              );
              if (container) {
                container.style.display = "flex";
                container.style.opacity = "1";
                container.style.zIndex = "10000";

                const leftView = document.getElementById("tabboost-split-left");
                const rightView = document.getElementById(
                  "tabboost-split-right"
                );

                if (leftView && rightView) {
                  leftView.style.display = "block";
                  leftView.style.width = "50%";
                  rightView.style.display = "block";
                  rightView.style.width = "50%";
                }

                return true;
              }
              return false;
            } catch (e) {
              console.error("Error making split view container visible:", e);
              return false;
            }
          },
        });

        return true;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: (url, i18nMessages) => {
          try {
            // 创建基本分屏容器
            const container = document.createElement("div");
            container.id = "tabboost-split-view-container";
            container.style.position = "fixed";
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.zIndex = "10000";
            container.style.backgroundColor = "#fff";
            container.style.display = "flex";
            container.style.overflow = "hidden";

            // 创建视图容器
            const viewsContainer = document.createElement("div");
            viewsContainer.id = "tabboost-views-container";
            viewsContainer.style.display = "flex";
            viewsContainer.style.width = "100%";
            viewsContainer.style.height = "100%";
            viewsContainer.style.position = "relative";
            viewsContainer.style.flexDirection = "row";
            viewsContainer.setAttribute("data-split-direction", "horizontal");

            // 创建左侧视图
            const leftView = document.createElement("div");
            leftView.id = "tabboost-split-left";
            leftView.style.width = "50%";
            leftView.style.height = "100%";
            leftView.style.overflow = "hidden";
            leftView.style.position = "relative";

            // 左侧关闭按钮
            const leftCloseButton = document.createElement("button");
            leftCloseButton.className = "tabboost-view-close";
            leftCloseButton.dataset.action = "close-split-view";
            leftCloseButton.style.position = "absolute";
            leftCloseButton.style.top = "8px";
            leftCloseButton.style.right = "8px";
            leftCloseButton.style.zIndex = "10";
            leftCloseButton.style.width = "24px";
            leftCloseButton.style.height = "24px";
            leftCloseButton.innerText = "×";
            leftCloseButton.title = i18nMessages.closeSplitView;
            leftCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            leftCloseButton.style.color = "#fff";
            leftCloseButton.style.border = "none";
            leftCloseButton.style.borderRadius = "50%";
            leftCloseButton.style.cursor = "pointer";

            leftCloseButton.addEventListener("click", () => {
              const rightIframe = document.getElementById(
                "tabboost-right-iframe"
              );
              if (
                rightIframe &&
                rightIframe.src &&
                rightIframe.src !== "about:blank"
              ) {
                const rightUrl = rightIframe.src;
                chrome.runtime.sendMessage({ action: "closeSplitView" });
                setTimeout(() => {
                  try {
                    window.location.href = rightUrl;
                  } catch (e) {
                    console.error("Error setting location to right URL:", e);
                  }
                }, 100);
              } else {
                chrome.runtime.sendMessage({ action: "closeSplitView" });
              }
            });

            leftView.appendChild(leftCloseButton);

            const leftSettingsButton = document.createElement("button");
            leftSettingsButton.className = "tabboost-view-settings";
            leftSettingsButton.style.position = "absolute";
            leftSettingsButton.style.top = "8px";
            leftSettingsButton.style.right = "40px";
            leftSettingsButton.style.zIndex = "10";
            leftSettingsButton.style.width = "24px";
            leftSettingsButton.style.height = "24px";
            leftSettingsButton.title = i18nMessages.splitViewSettings;
            leftSettingsButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            leftSettingsButton.style.border = "none";
            leftSettingsButton.style.borderRadius = "50%";
            leftSettingsButton.style.cursor = "pointer";
            leftSettingsButton.style.display = "flex";
            leftSettingsButton.style.alignItems = "center";
            leftSettingsButton.style.justifyContent = "center";
            leftSettingsButton.style.padding = "0";
            leftSettingsButton.style.opacity = "0";
            leftSettingsButton.style.transition = "opacity 0.2s";

            const createSplitIcon = () => {
              const icon = document.createElement("div");
              icon.style.width = "16px";
              icon.style.height = "12px";
              icon.style.position = "relative";
              icon.style.backgroundColor = "#ffffff";
              icon.style.borderRadius = "2px";
              icon.style.overflow = "hidden";

              const divider = document.createElement("div");
              divider.style.position = "absolute";
              divider.style.top = "0";
              divider.style.left = "50%";
              divider.style.width = "1px";
              divider.style.height = "100%";
              divider.style.backgroundColor = "#666666";
              divider.style.transform = "translateX(-50%)";

              icon.appendChild(divider);
              return icon;
            };

            leftSettingsButton.appendChild(createSplitIcon());
            leftView.appendChild(leftSettingsButton);

            const leftIframe = document.createElement("iframe");
            leftIframe.id = "tabboost-left-iframe";
            leftIframe.style.width = "100%";
            leftIframe.style.height = "100%";
            leftIframe.style.border = "none";
            leftIframe.style.display = "block";
            leftIframe.setAttribute("loading", "lazy");
            leftIframe.setAttribute("data-tabboost-frame", "left");
            leftIframe.setAttribute("allowfullscreen", "true");
            // 直接设置src，不使用懒加载以避免webpack导入错误
            leftIframe.src = url;

            leftView.appendChild(leftIframe);

            const rightView = document.createElement("div");
            rightView.id = "tabboost-split-right";
            rightView.style.width = "50%";
            rightView.style.height = "100%";
            rightView.style.overflow = "hidden";
            rightView.style.position = "relative";

            const rightCloseButton = document.createElement("button");
            rightCloseButton.className = "tabboost-view-close";
            rightCloseButton.dataset.action = "close-split-view";
            rightCloseButton.style.position = "absolute";
            rightCloseButton.style.top = "8px";
            rightCloseButton.style.right = "8px";
            rightCloseButton.style.zIndex = "10";
            rightCloseButton.style.width = "24px";
            rightCloseButton.style.height = "24px";
            rightCloseButton.innerText = "×";
            rightCloseButton.title = i18nMessages.closeSplitView;
            rightCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            rightCloseButton.style.color = "#fff";
            rightCloseButton.style.border = "none";
            rightCloseButton.style.borderRadius = "50%";
            rightCloseButton.style.cursor = "pointer";

            rightCloseButton.addEventListener("click", () => {
              chrome.runtime.sendMessage({ action: "closeSplitView" });
            });

            rightView.appendChild(rightCloseButton);

            const rightSettingsButton = document.createElement("button");
            rightSettingsButton.className = "tabboost-view-settings";
            rightSettingsButton.style.position = "absolute";
            rightSettingsButton.style.top = "8px";
            rightSettingsButton.style.right = "40px";
            rightSettingsButton.style.zIndex = "10";
            rightSettingsButton.style.width = "24px";
            rightSettingsButton.style.height = "24px";
            rightSettingsButton.title = i18nMessages.splitViewSettings;
            rightSettingsButton.style.backgroundColor = "rgba(0,0,0,0.5)";
            rightSettingsButton.style.border = "none";
            rightSettingsButton.style.borderRadius = "50%";
            rightSettingsButton.style.cursor = "pointer";
            rightSettingsButton.style.display = "flex";
            rightSettingsButton.style.alignItems = "center";
            rightSettingsButton.style.justifyContent = "center";
            rightSettingsButton.style.padding = "0";
            rightSettingsButton.style.opacity = "0";
            rightSettingsButton.style.transition = "opacity 0.2s";

            rightSettingsButton.appendChild(createSplitIcon());
            rightView.appendChild(rightSettingsButton);

            const rightIframe = document.createElement("iframe");
            rightIframe.id = "tabboost-right-iframe";
            rightIframe.style.width = "100%";
            rightIframe.style.height = "100%";
            rightIframe.style.border = "none";
            rightIframe.style.display = "block";
            rightIframe.setAttribute("loading", "lazy");
            rightIframe.setAttribute("data-tabboost-frame", "right");
            rightIframe.setAttribute("allowfullscreen", "true");
            rightIframe.src = "about:blank";

            rightView.appendChild(rightIframe);

            viewsContainer.appendChild(leftView);
            viewsContainer.appendChild(rightView);
            container.appendChild(viewsContainer);

            try {
              const originalContent = document.documentElement.outerHTML || "";
              document.body.setAttribute(
                "data-tabboost-original-content",
                originalContent
              );
            } catch (e) {
              console.error("TabBoost: Error storing original content", e);
            }

            const existingElements = Array.from(document.body.children);
            existingElements.forEach((element) => {
              element.dataset.originalDisplay = element.style.display;
              element.style.display = "none";
            });

            document.body.style.overflow = "hidden";
            document.body.appendChild(container);

            const createRatioMenu = (settingsButton, viewSide) => {
              const menu = document.createElement("div");
              menu.className = "tabboost-ratio-menu";
              menu.style.position = "absolute";
              menu.style.top = "35px";
              menu.style.right = viewSide === "left" ? "40px" : "40px";
              menu.style.backgroundColor = "#ffffff";
              menu.style.border = "1px solid rgba(0,0,0,0.1)";
              menu.style.borderRadius = "6px";
              menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              menu.style.zIndex = "100";
              menu.style.display = "none";
              menu.style.padding = "6px 0";
              menu.style.minWidth = "160px";

              const getCurrentDirection = () => {
                const viewsContainer = document.getElementById(
                  "tabboost-views-container"
                );
                return viewsContainer &&
                  viewsContainer.getAttribute("data-split-direction") ===
                    "vertical"
                  ? "vertical"
                  : "horizontal";
              };

              const layoutSection = document.createElement("div");
              layoutSection.style.borderBottom = "1px solid #f0f0f0";
              layoutSection.style.paddingBottom = "6px";
              layoutSection.style.marginBottom = "6px";

              const horizontalOption = document.createElement("div");
              horizontalOption.style.padding = "8px 12px";
              horizontalOption.style.cursor = "pointer";
              horizontalOption.style.display = "flex";
              horizontalOption.style.alignItems = "center";
              horizontalOption.style.gap = "12px";
              horizontalOption.style.borderRadius = "4px";
              horizontalOption.style.transition = "background-color 0.2s";
              horizontalOption.setAttribute("data-layout", "horizontal");

              const horizontalIcon = document.createElement("div");
              horizontalIcon.style.width = "20px";
              horizontalIcon.style.height = "20px";
              horizontalIcon.style.position = "relative";
              horizontalIcon.style.display = "flex";
              horizontalIcon.style.alignItems = "center";
              horizontalIcon.style.justifyContent = "center";
              horizontalIcon.style.backgroundColor = "#f5f5f5";
              horizontalIcon.style.borderRadius = "3px";
              horizontalIcon.innerHTML =
                '<svg viewBox="0 0 20 20" width="20" height="20"><rect x="1" y="3" width="8" height="14" fill="#e0e0e0" rx="2"/><rect x="11" y="3" width="8" height="14" fill="#e0e0e0" rx="2"/></svg>';

              const horizontalLabel = document.createElement("span");
              horizontalLabel.innerText = i18nMessages.splitViewHorizontal;
              horizontalLabel.style.fontSize = "13px";
              horizontalLabel.style.color = "#333333";

              horizontalOption.appendChild(horizontalIcon);
              horizontalOption.appendChild(horizontalLabel);

              const verticalOption = document.createElement("div");
              verticalOption.style.padding = "8px 12px";
              verticalOption.style.cursor = "pointer";
              verticalOption.style.display = "flex";
              verticalOption.style.alignItems = "center";
              verticalOption.style.gap = "12px";
              verticalOption.style.borderRadius = "4px";
              verticalOption.style.transition = "background-color 0.2s";
              verticalOption.setAttribute("data-layout", "vertical");

              const verticalIcon = document.createElement("div");
              verticalIcon.style.width = "20px";
              verticalIcon.style.height = "20px";
              verticalIcon.style.position = "relative";
              verticalIcon.style.display = "flex";
              verticalIcon.style.alignItems = "center";
              verticalIcon.style.justifyContent = "center";
              verticalIcon.style.backgroundColor = "#f5f5f5";
              verticalIcon.style.borderRadius = "3px";
              verticalIcon.innerHTML =
                '<svg viewBox="0 0 20 20" width="20" height="20"><rect x="1" y="1" width="18" height="8" fill="#e0e0e0" rx="2"/><rect x="1" y="11" width="18" height="8" fill="#e0e0e0" rx="2"/></svg>';

              const verticalLabel = document.createElement("span");
              verticalLabel.innerText = i18nMessages.splitViewVertical;
              verticalLabel.style.fontSize = "13px";
              verticalLabel.style.color = "#333333";

              verticalOption.appendChild(verticalIcon);
              verticalOption.appendChild(verticalLabel);

              horizontalOption.addEventListener("mouseover", () => {
                horizontalOption.style.backgroundColor = "#f5f5f5";
              });
              horizontalOption.addEventListener("mouseout", () => {
                horizontalOption.style.backgroundColor = "transparent";
              });

              verticalOption.addEventListener("mouseover", () => {
                verticalOption.style.backgroundColor = "#f5f5f5";
              });
              verticalOption.addEventListener("mouseout", () => {
                verticalOption.style.backgroundColor = "transparent";
              });

              const setLayout = (direction) => {
                const leftView = document.getElementById("tabboost-split-left");
                const rightView = document.getElementById(
                  "tabboost-split-right"
                );
                const viewsContainer = document.getElementById(
                  "tabboost-views-container"
                );

                if (!leftView || !rightView || !viewsContainer) return;

                if (direction === "vertical") {
                  viewsContainer.style.flexDirection = "column";
                  leftView.style.width = "100%";
                  leftView.style.height = "50%";
                  rightView.style.width = "100%";
                  rightView.style.height = "50%";
                  viewsContainer.setAttribute(
                    "data-split-direction",
                    "vertical"
                  );
                } else {
                  viewsContainer.style.flexDirection = "row";
                  leftView.style.width = "50%";
                  leftView.style.height = "100%";
                  rightView.style.width = "50%";
                  rightView.style.height = "100%";
                  viewsContainer.setAttribute(
                    "data-split-direction",
                    "horizontal"
                  );
                }

                setTimeout(() => updateRatioIcons(), 50);
              };

              horizontalOption.addEventListener("click", () => {
                setLayout("horizontal");
                menu.style.display = "none";
              });

              verticalOption.addEventListener("click", () => {
                setLayout("vertical");
                menu.style.display = "none";
              });

              layoutSection.appendChild(horizontalOption);
              layoutSection.appendChild(verticalOption);
              menu.appendChild(layoutSection);

              const ratios = [
                {
                  left: 50,
                  right: 50,
                  top: 50,
                  bottom: 50,
                  label: i18nMessages.splitViewEqualRatio,
                },
                {
                  left: 70,
                  right: 30,
                  top: 70,
                  bottom: 30,
                  label: i18nMessages.splitViewLeftLarger,
                },
                {
                  left: 30,
                  right: 70,
                  top: 30,
                  bottom: 70,
                  label: i18nMessages.splitViewRightLarger,
                },
              ];

              const ratioSection = document.createElement("div");

              ratios.forEach((ratio) => {
                const option = document.createElement("div");
                option.style.padding = "8px 12px";
                option.style.cursor = "pointer";
                option.style.display = "flex";
                option.style.alignItems = "center";
                option.style.gap = "12px";
                option.style.borderRadius = "4px";
                option.style.transition = "background-color 0.2s";
                option.setAttribute("data-ratio", JSON.stringify(ratio));

                const diagram = document.createElement("div");
                diagram.style.width = "20px";
                diagram.style.height = "20px";
                diagram.style.position = "relative";
                diagram.style.display = "flex";
                diagram.style.alignItems = "center";
                diagram.style.justifyContent = "center";
                diagram.style.backgroundColor = "#f5f5f5";
                diagram.style.borderRadius = "3px";
                diagram.style.overflow = "hidden";

                const createSvgForDiagram = (direction) => {
                  diagram.innerHTML = "";

                  let svgContent = "";

                  if (direction === "vertical") {
                    const topHeight = ratio.top;
                    const bottomHeight = ratio.bottom;

                    svgContent = `<svg viewBox="0 0 20 20" width="20" height="20">
                      <rect x="1" y="1" width="18" height="${(topHeight / 100) * 17}" fill="#e0e0e0" rx="2"/>
                      <rect x="1" y="${2 + (topHeight / 100) * 17}" width="18" height="${(bottomHeight / 100) * 17}" fill="#e0e0e0" rx="2"/>
                    </svg>`;
                  } else {
                    const leftWidth = ratio.left;
                    const rightWidth = ratio.right;

                    svgContent = `<svg viewBox="0 0 20 20" width="20" height="20">
                      <rect x="1" y="3" width="${(leftWidth / 100) * 17}" height="14" fill="#e0e0e0" rx="2"/>
                      <rect x="${2 + (leftWidth / 100) * 17}" y="3" width="${(rightWidth / 100) * 17}" height="14" fill="#e0e0e0" rx="2"/>
                    </svg>`;
                  }

                  diagram.innerHTML = svgContent;
                };

                createSvgForDiagram(getCurrentDirection());

                diagram.updateDivider = createSvgForDiagram;

                const label = document.createElement("span");
                label.innerText = ratio.label;
                label.style.fontSize = "13px";
                label.style.color = "#333333";
                label.style.fontWeight = "500";

                option.appendChild(diagram);
                option.appendChild(label);

                option.addEventListener("mouseover", () => {
                  option.style.backgroundColor = "#f5f5f5";
                });
                option.addEventListener("mouseout", () => {
                  option.style.backgroundColor = "transparent";
                });

                option.addEventListener("click", () => {
                  const leftView = document.getElementById(
                    "tabboost-split-left"
                  );
                  const rightView = document.getElementById(
                    "tabboost-split-right"
                  );
                  const viewsContainer = document.getElementById(
                    "tabboost-views-container"
                  );

                  if (!leftView || !rightView || !viewsContainer) return;

                  const isVertical =
                    viewsContainer.getAttribute("data-split-direction") ===
                    "vertical";

                  if (isVertical) {
                    leftView.style.height = `${ratio.top}%`;
                    rightView.style.height = `${ratio.bottom}%`;
                  } else {
                    leftView.style.width = `${ratio.left}%`;
                    rightView.style.width = `${ratio.right}%`;
                  }

                  menu.style.display = "none";
                });

                ratioSection.appendChild(option);
              });

              menu.appendChild(ratioSection);

              menu.ratioOptions = ratioSection.children;
              settingsButton.parentElement.appendChild(menu);

              settingsButton.addEventListener("click", () => {
                const allMenus = document.querySelectorAll(
                  ".tabboost-ratio-menu"
                );
                allMenus.forEach((m) => {
                  if (m !== menu) m.style.display = "none";
                });

                if (menu.style.display === "none") {
                  const currentDirection = getCurrentDirection();
                  Array.from(menu.ratioOptions).forEach((option) => {
                    const diagram = option.firstChild;
                    if (diagram && diagram.updateDivider) {
                      diagram.updateDivider(currentDirection);
                    }
                  });
                }

                menu.style.display =
                  menu.style.display === "none" ? "block" : "none";
              });

              document.addEventListener("click", (e) => {
                if (
                  !settingsButton.contains(e.target) &&
                  !menu.contains(e.target)
                ) {
                  menu.style.display = "none";
                }
              });

              return menu;
            };

            createRatioMenu(leftSettingsButton, "left");
            createRatioMenu(rightSettingsButton, "right");

            function updateRatioIcons() {
              const viewsContainer = document.getElementById(
                "tabboost-views-container"
              );
              if (!viewsContainer) return;

              const direction =
                viewsContainer.getAttribute("data-split-direction") ===
                "vertical"
                  ? "vertical"
                  : "horizontal";

              document
                .querySelectorAll(".tabboost-ratio-menu")
                .forEach((menu) => {
                  if (!menu.ratioOptions) return;

                  Array.from(menu.ratioOptions).forEach((option) => {
                    const diagram = option.firstChild;
                    if (diagram && diagram.updateDivider) {
                      diagram.updateDivider(direction);
                    }
                  });
                });
            }

            document.addEventListener("click", function (event) {
              if (event.target.closest("[data-layout]")) {
                const layoutType = event.target
                  .closest("[data-layout]")
                  .getAttribute("data-layout");
                if (layoutType) {
                  setTimeout(() => updateRatioIcons(), 100);
                }
              }
            });

            const applyDefaultRatio = () => {
              try {
                const leftView = document.getElementById("tabboost-split-left");
                const rightView = document.getElementById(
                  "tabboost-split-right"
                );
                const viewsContainer = document.getElementById(
                  "tabboost-views-container"
                );

                if (leftView && rightView && viewsContainer) {
                  const isVertical =
                    viewsContainer.getAttribute("data-split-direction") ===
                    "vertical";

                  if (isVertical) {
                    leftView.style.height = "50%";
                    leftView.style.width = "100%";
                    rightView.style.height = "50%";
                    rightView.style.width = "100%";
                  } else {
                    leftView.style.width = "50%";
                    leftView.style.height = "100%";
                    rightView.style.width = "50%";
                    rightView.style.height = "100%";
                  }
                }
              } catch (e) {
                console.error("Error applying default split ratio:", e);
              }
            };

            applyDefaultRatio();

            leftView.addEventListener("mouseenter", () => {
              const closeButton = leftView.querySelector(
                ".tabboost-view-close"
              );
              const settingsButton = leftView.querySelector(
                ".tabboost-view-settings"
              );
              if (closeButton) closeButton.style.opacity = "1";
              if (settingsButton) settingsButton.style.opacity = "1";
            });

            leftView.addEventListener("mouseleave", () => {
              const closeButton = leftView.querySelector(
                ".tabboost-view-close"
              );
              const settingsButton = leftView.querySelector(
                ".tabboost-view-settings"
              );
              if (closeButton) closeButton.style.opacity = "0";
              if (settingsButton) settingsButton.style.opacity = "0";
            });

            rightView.addEventListener("mouseenter", () => {
              const closeButton = rightView.querySelector(
                ".tabboost-view-close"
              );
              const settingsButton = rightView.querySelector(
                ".tabboost-view-settings"
              );
              if (closeButton) closeButton.style.opacity = "1";
              if (settingsButton) settingsButton.style.opacity = "1";
            });

            rightView.addEventListener("mouseleave", () => {
              const closeButton = rightView.querySelector(
                ".tabboost-view-close"
              );
              const settingsButton = rightView.querySelector(
                ".tabboost-view-settings"
              );
              if (closeButton) closeButton.style.opacity = "0";
              if (settingsButton) settingsButton.style.opacity = "0";
            });

            viewsContainer.setAttribute("data-split-direction", "horizontal");

            return true;
          } catch (e) {
            console.error("TabBoost: Error creating split view:", e);
            return false;
          }
        },
        args: [
          leftUrl,
          {
            closeSplitView: i18n.getMessage("closeSplitView"),
            splitViewSettings: i18n.getMessage("splitViewSettings"),
            splitViewEqualRatio: i18n.getMessage("splitViewEqualRatio"),
            splitViewLeftLarger: i18n.getMessage("splitViewLeftLarger"),
            splitViewRightLarger: i18n.getMessage("splitViewRightLarger"),
            splitViewHorizontal: i18n.getMessage("splitViewHorizontal"),
            splitViewVertical: i18n.getMessage("splitViewVertical"),
          },
        ],
      });

      if (results && results[0] && results[0].result) {
        return true;
      } else {
        console.error("TabBoost: Failed to create split view");
        return false;
      }
    } catch (e) {
      console.error("TabBoost: Failed to execute split view script:", e);
      console.log("TabBoost: Will retry with minimal approach");

      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: (url) => {
            try {
              if (!document.getElementById("tabboost-split-view-container")) {
                const container = document.createElement("div");
                container.id = "tabboost-split-view-container";
                container.style.position = "fixed";
                container.style.top = "0";
                container.style.left = "0";
                container.style.width = "100%";
                container.style.height = "100%";
                container.style.zIndex = "10000";
                container.style.backgroundColor = "#fff";
                container.style.display = "flex";
                container.style.overflow = "hidden";

                const viewsContainer = document.createElement("div");
                viewsContainer.id = "tabboost-views-container";
                viewsContainer.style.display = "flex";
                viewsContainer.style.width = "100%";
                viewsContainer.style.height = "100%";

                const leftView = document.createElement("div");
                leftView.id = "tabboost-split-left";
                leftView.style.width = "50%";
                leftView.style.height = "100%";
                leftView.style.position = "relative";

                const leftCloseButton = document.createElement("button");
                leftCloseButton.className = "tabboost-view-close";
                leftCloseButton.dataset.action = "close-split-view";
                leftCloseButton.style.position = "absolute";
                leftCloseButton.style.top = "8px";
                leftCloseButton.style.right = "8px";
                leftCloseButton.style.zIndex = "10";
                leftCloseButton.style.width = "24px";
                leftCloseButton.style.height = "24px";
                leftCloseButton.innerText = "×";
                leftCloseButton.title = i18n.getMessage("closeSplitView");
                leftCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
                leftCloseButton.style.color = "#fff";
                leftCloseButton.style.border = "none";
                leftCloseButton.style.borderRadius = "50%";
                leftCloseButton.style.cursor = "pointer";

                leftCloseButton.addEventListener("click", () => {
                  const rightIframe = document.getElementById(
                    "tabboost-right-iframe"
                  );
                  if (
                    rightIframe &&
                    rightIframe.src &&
                    rightIframe.src !== "about:blank"
                  ) {
                    const rightUrl = rightIframe.src;
                    chrome.runtime.sendMessage({ action: "closeSplitView" });
                    setTimeout(() => {
                      try {
                        window.location.href = rightUrl;
                      } catch (e) {
                        console.error(
                          "TabBoost: Error setting location to right URL:",
                          e
                        );
                      }
                    }, 100);
                  } else {
                    chrome.runtime.sendMessage({ action: "closeSplitView" });
                  }
                });

                leftView.appendChild(leftCloseButton);

                const leftIframe = document.createElement("iframe");
                leftIframe.id = "tabboost-left-iframe";
                leftIframe.style.width = "100%";
                leftIframe.style.height = "100%";
                leftIframe.style.border = "none";
                leftIframe.src = window.location.href;

                leftView.appendChild(leftIframe);

                const rightView = document.createElement("div");
                rightView.id = "tabboost-split-right";
                rightView.style.width = "50%";
                rightView.style.height = "100%";
                rightView.style.position = "relative";

                const rightCloseButton = document.createElement("button");
                rightCloseButton.className = "tabboost-view-close";
                rightCloseButton.dataset.action = "close-split-view";
                rightCloseButton.style.position = "absolute";
                rightCloseButton.style.top = "8px";
                rightCloseButton.style.right = "8px";
                rightCloseButton.style.zIndex = "10";
                rightCloseButton.style.width = "24px";
                rightCloseButton.style.height = "24px";
                rightCloseButton.innerText = "×";
                rightCloseButton.title = i18n.getMessage("closeSplitView");
                rightCloseButton.style.backgroundColor = "rgba(0,0,0,0.5)";
                rightCloseButton.style.color = "#fff";
                rightCloseButton.style.border = "none";
                rightCloseButton.style.borderRadius = "50%";
                rightCloseButton.style.cursor = "pointer";

                rightCloseButton.addEventListener("click", () => {
                  chrome.runtime.sendMessage({ action: "closeSplitView" });
                });

                rightView.appendChild(rightCloseButton);

                const rightIframe = document.createElement("iframe");
                rightIframe.id = "tabboost-right-iframe";
                rightIframe.style.width = "100%";
                rightIframe.style.height = "100%";
                rightIframe.style.border = "none";
                // 直接设置src，不使用懒加载以避免webpack导入错误
                rightIframe.src = url;

                rightView.appendChild(rightIframe);

                viewsContainer.appendChild(leftView);
                viewsContainer.appendChild(rightView);

                container.appendChild(viewsContainer);

                document.body.appendChild(container);

                return true;
              }
            } catch (e) {
              console.error("TabBoost: Error creating minimal split view:", e);
              return false;
            }
          },
          args: [leftUrl],
        });

        return true;
      } catch (retryError) {
        console.error(
          "TabBoost: Failed to create minimal split view:",
          retryError
        );
        return false;
      }
    }
  } catch (error) {
    console.error("TabBoost: Failed to create split view:", error);
    return false;
  }
}

/**
 * 关闭分屏视图
 * @returns {Promise<boolean>} - 是否成功关闭
 */
export async function closeSplitView() {
  if (!splitViewState.getState().isActive) return true;

  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab");
      return false;
    }

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: removeSplitViewDOM,
      });

      const success = result && result[0] && result[0].result;
      if (success) {
        splitViewState.deactivate();
      } else {
        await chrome.tabs.reload(currentTab.id);
        splitViewState.deactivate();
      }

      return true;
    } catch (e) {
      console.error("Failed to execute restore page script:", e);

      try {
        await chrome.tabs.reload(currentTab.id);
        splitViewState.deactivate();
        return true;
      } catch (reloadError) {
        console.error("Failed to reload page:", reloadError);
        return false;
      }
    }
  } catch (error) {
    console.error("Failed to close split view:", error);
  }
}

/**
 * 切换分屏视图状态
 * @returns {Promise<boolean>} - 操作是否成功
 */
export async function toggleSplitView() {
  if (splitViewState.getState().isActive) {
    return await closeSplitView();
  } else {
    return await createSplitView();
  }
}

/**
 * 更新右侧视图
 * @param {string} url - 右侧视图URL
 * @returns {Promise<boolean>} - 是否成功更新
 */
export async function updateRightView(url) {
  if (!splitViewState.getState().isActive) {
    const success = await createSplitView();
    if (!success) {
      return false;
    }
  }

  splitViewState.setRightUrl(url);

  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("Failed to get current tab for updateRightView");
      return false;
    }

    const checkResult = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        try {
          const container = document.getElementById(
            "tabboost-split-view-container"
          );
          return !!container;
        } catch (e) {
          console.error("Error checking split view container:", e);
          return false;
        }
      },
    });

    if (!checkResult || !checkResult[0].result) {
      console.log("Split view container not found, recreating...");
      await createSplitView();
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (url) => {
        try {
          const rightView = document.getElementById("tabboost-split-right");
          if (!rightView) {
            console.error("Right view not found");
            return false;
          }

          let rightIframe = document.getElementById("tabboost-right-iframe");

          if (!rightIframe) {
            rightIframe = document.createElement("iframe");
            rightIframe.id = "tabboost-right-iframe";
            rightIframe.style.width = "100%";
            rightIframe.style.height = "100%";
            rightIframe.style.border = "none";
            rightIframe.style.display = "block";
            rightIframe.setAttribute("allowfullscreen", "true");

            rightView.appendChild(rightIframe);
          }

          rightView.style.display = "block";

          const viewsContainer = document.getElementById(
            "tabboost-views-container"
          );
          const isVertical =
            viewsContainer &&
            viewsContainer.getAttribute("data-split-direction") === "vertical";

          if (isVertical) {
            rightView.style.width = "100%";
            rightView.style.height = "50%";

            const leftView = document.getElementById("tabboost-split-left");
            if (leftView) {
              leftView.style.height = "50%";
              leftView.style.width = "100%";
            }
          } else {
            rightView.style.width = "50%";
            rightView.style.height = "100%";

            const leftView = document.getElementById("tabboost-split-left");
            if (leftView) {
              leftView.style.width = "50%";
              leftView.style.height = "100%";
            }
          }

          // 直接设置src，不使用懒加载以避免webpack导入错误
          rightIframe.src = url;

          return true;
        } catch (error) {
          console.error("Error in updateRightViewDOM:", error);
          return false;
        }
      },
      args: [url],
    });

    return true;
  } catch (error) {
    console.error("Failed to update right view:", error);

    try {
      await chrome.tabs.create({ url });
      return true;
    } catch (e) {
      console.error("Failed to open URL in new tab:", e);
      return false;
    }
  }
}

/**
 * 获取分屏视图状态
 * @returns {Object} 分屏视图状态
 */
export function getSplitViewState() {
  return splitViewState.getState();
}

/**
 * 模块初始化
 */
export function initSplitViewModule() {
  splitViewState.init();
}

export default {
  createSplitView,
  closeSplitView,
  toggleSplitView,
  updateRightView,
  getSplitViewState,
  initSplitViewModule,
};
