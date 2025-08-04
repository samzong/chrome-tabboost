import { UI_CONFIG, LAYOUT_CONFIG, SVG_CONFIG } from "./splitViewConfig.js";
import { createElement } from "./splitViewDOMUtils.js";
import { safeAddEventListener } from "./splitViewUtils.js";
import * as i18n from "../../utils/i18n.js";

export function createSplitIcon() {
  const icon = createElement("div", {
    styles: {
      width: "16px",
      height: "12px",
      position: "relative",
      backgroundColor: "#ffffff",
      borderRadius: "2px",
      overflow: "hidden",
    },
  });

  const divider = createElement("div", {
    styles: {
      position: "absolute",
      top: "0",
      left: "50%",
      width: "1px",
      height: "100%",
      backgroundColor: "#666666",
      transform: "translateX(-50%)",
    },
  });

  icon.appendChild(divider);
  return icon;
}

export function createSettingsButton(side) {
  const settingsButton = createElement("button", UI_CONFIG.settingsButton);
  settingsButton.title = "Split ratio settings";
  settingsButton.appendChild(createSplitIcon());
  return settingsButton;
}

export function getCurrentDirection() {
  const viewsContainer = document.getElementById(UI_CONFIG.viewsContainer.id);
  return viewsContainer &&
    viewsContainer.getAttribute("data-split-direction") === "vertical"
    ? "vertical"
    : "horizontal";
}

export function updateRatioIcons() {
  const direction = getCurrentDirection();

  document
    .querySelectorAll(`.${UI_CONFIG.ratioMenu.className}`)
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

export function createRatioMenu(settingsButton, viewSide) {
  const menu = createElement("div", UI_CONFIG.ratioMenu);
  menu.style.right = viewSide === "left" ? "40px" : "40px";

  const layoutSection = createElement("div", {
    styles: {
      borderBottom: "1px solid #f0f0f0",
      paddingBottom: "6px",
      marginBottom: "6px",
    },
  });

  const horizontalOption = createElement("div", UI_CONFIG.ratioMenu.menuItem);
  horizontalOption.setAttribute("data-layout", "horizontal");

  const horizontalIcon = createElement(
    "div",
    UI_CONFIG.ratioMenu.iconContainer
  );
  horizontalIcon.innerHTML = SVG_CONFIG.horizontal;

  const horizontalLabel = createElement("span", UI_CONFIG.ratioMenu.label);
  horizontalLabel.innerText = i18n.getMessage("splitViewHorizontal");

  horizontalOption.appendChild(horizontalIcon);
  horizontalOption.appendChild(horizontalLabel);

  const verticalOption = createElement("div", UI_CONFIG.ratioMenu.menuItem);
  verticalOption.setAttribute("data-layout", "vertical");

  const verticalIcon = createElement("div", UI_CONFIG.ratioMenu.iconContainer);
  verticalIcon.innerHTML = SVG_CONFIG.vertical;

  const verticalLabel = createElement("span", UI_CONFIG.ratioMenu.label);
  verticalLabel.innerText = i18n.getMessage("splitViewVertical");

  verticalOption.appendChild(verticalIcon);
  verticalOption.appendChild(verticalLabel);

  safeAddEventListener(horizontalOption, "mouseover", () => {
    horizontalOption.style.backgroundColor = "#f5f5f5";
  });
  safeAddEventListener(horizontalOption, "mouseout", () => {
    horizontalOption.style.backgroundColor = "transparent";
  });

  safeAddEventListener(verticalOption, "mouseover", () => {
    verticalOption.style.backgroundColor = "#f5f5f5";
  });
  safeAddEventListener(verticalOption, "mouseout", () => {
    verticalOption.style.backgroundColor = "transparent";
  });

  const setLayout = (direction) => {
    const leftView = document.getElementById(UI_CONFIG.view.left.id);
    const rightView = document.getElementById(UI_CONFIG.view.right.id);
    const viewsContainer = document.getElementById(UI_CONFIG.viewsContainer.id);

    if (!leftView || !rightView || !viewsContainer) return;

    if (direction === "vertical") {
      viewsContainer.style.flexDirection = LAYOUT_CONFIG.vertical.flexDirection;
      leftView.style.width = LAYOUT_CONFIG.vertical.leftWidth;
      leftView.style.height = LAYOUT_CONFIG.vertical.leftHeight;
      rightView.style.width = LAYOUT_CONFIG.vertical.rightWidth;
      rightView.style.height = LAYOUT_CONFIG.vertical.rightHeight;
      viewsContainer.setAttribute("data-split-direction", "vertical");
    } else {
      viewsContainer.style.flexDirection =
        LAYOUT_CONFIG.horizontal.flexDirection;
      leftView.style.width = LAYOUT_CONFIG.horizontal.leftWidth;
      leftView.style.height = LAYOUT_CONFIG.horizontal.leftHeight;
      rightView.style.width = LAYOUT_CONFIG.horizontal.rightWidth;
      rightView.style.height = LAYOUT_CONFIG.horizontal.rightHeight;
      viewsContainer.setAttribute("data-split-direction", "horizontal");
    }

    setTimeout(() => updateRatioIcons(), 50);
  };

  safeAddEventListener(horizontalOption, "click", () => {
    setLayout("horizontal");
    menu.style.display = "none";
  });

  safeAddEventListener(verticalOption, "click", () => {
    setLayout("vertical");
    menu.style.display = "none";
  });

  layoutSection.appendChild(horizontalOption);
  layoutSection.appendChild(verticalOption);
  menu.appendChild(layoutSection);

  const ratios = LAYOUT_CONFIG.ratioPresets;

  const ratioSection = createElement("div");

  ratios.forEach((ratio) => {
    const option = createElement("div", UI_CONFIG.ratioMenu.menuItem);
    option.setAttribute("data-ratio", JSON.stringify(ratio));

    const diagram = createElement("div", UI_CONFIG.ratioMenu.iconContainer);

    const createSvgForDiagram = (direction) => {
      diagram.innerHTML = "";

      if (direction === "vertical") {
        diagram.innerHTML = SVG_CONFIG.verticalRatio(ratio.top, ratio.bottom);
      } else {
        diagram.innerHTML = SVG_CONFIG.horizontalRatio(ratio.left, ratio.right);
      }
    };

    createSvgForDiagram(getCurrentDirection());

    diagram.updateDivider = createSvgForDiagram;

    const label = createElement("span", {
      ...UI_CONFIG.ratioMenu.label,
      styles: {
        ...UI_CONFIG.ratioMenu.label.styles,
        fontWeight: "500",
      },
    });
    label.innerText = ratio.label;

    option.appendChild(diagram);
    option.appendChild(label);

    safeAddEventListener(option, "mouseover", () => {
      option.style.backgroundColor = "#f5f5f5";
    });
    safeAddEventListener(option, "mouseout", () => {
      option.style.backgroundColor = "transparent";
    });

    safeAddEventListener(option, "click", () => {
      const leftView = document.getElementById(UI_CONFIG.view.left.id);
      const rightView = document.getElementById(UI_CONFIG.view.right.id);
      const viewsContainer = document.getElementById(
        UI_CONFIG.viewsContainer.id
      );

      if (!leftView || !rightView || !viewsContainer) return;

      const isVertical =
        viewsContainer.getAttribute("data-split-direction") === "vertical";

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

  safeAddEventListener(settingsButton, "click", () => {
    const allMenus = document.querySelectorAll(
      `.${UI_CONFIG.ratioMenu.className}`
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

    menu.style.display = menu.style.display === "none" ? "block" : "none";
  });

  safeAddEventListener(document, "click", (e) => {
    if (!settingsButton.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = "none";
    }
  });

  return menu;
}

export function addViewHoverEffects(view) {
  safeAddEventListener(view, "mouseenter", () => {
    const closeButton = view.querySelector(
      `.${UI_CONFIG.closeButton.className}`
    );
    const settingsButton = view.querySelector(
      `.${UI_CONFIG.settingsButton.className}`
    );
    if (closeButton) closeButton.style.opacity = "1";
    if (settingsButton) settingsButton.style.opacity = "1";
  });

  safeAddEventListener(view, "mouseleave", () => {
    const closeButton = view.querySelector(
      `.${UI_CONFIG.closeButton.className}`
    );
    const settingsButton = view.querySelector(
      `.${UI_CONFIG.settingsButton.className}`
    );
    if (closeButton) closeButton.style.opacity = "0";
    if (settingsButton) settingsButton.style.opacity = "0";
  });
}

export function applyDefaultRatio() {
  try {
    const leftView = document.getElementById(UI_CONFIG.view.left.id);
    const rightView = document.getElementById(UI_CONFIG.view.right.id);
    const viewsContainer = document.getElementById(UI_CONFIG.viewsContainer.id);

    if (leftView && rightView && viewsContainer) {
      const isVertical =
        viewsContainer.getAttribute("data-split-direction") === "vertical";

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
    
  }
}
