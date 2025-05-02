import storageCache from "../../utils/storage-cache.js";
import { getMessage } from "../../utils/i18n.js";

export function initSplitViewDOM(leftUrl) {
  try {
    if (!document || !document.body) {
      return;
    }

    try {
      const dummyMain = document.createElement("div");
      dummyMain.setAttribute("data-md-component", "main");
      dummyMain.style.display = "none";
      document.body.appendChild(dummyMain);
    } catch (e) {}

    const existingSplitView = document.getElementById(
      "tabboost-split-view-container"
    );
    if (existingSplitView) {
      existingSplitView.remove();
    }

    try {
      const safeQuerySelector = (selector) => {
        try {
          return document.querySelector(selector);
        } catch (e) {
          return null;
        }
      };

      const knownProblematicSelectors = ["[data-md-component=main]"];
      knownProblematicSelectors.forEach((selector) =>
        safeQuerySelector(selector)
      );
    } catch (e) {}

    let originalContent = "";
    try {
      originalContent = document.documentElement.outerHTML || "";
    } catch (e) {
      originalContent = document.body.innerHTML || "";
    }

    try {
      const maxContentLength = 500000;
      if (originalContent.length > maxContentLength) {
        console.warn(
          `TabBoost: Original content exceeds ${maxContentLength} characters, saving placeholder.`
        );
        originalContent = `<html><head><title>${document.title}</title></head><body><div class="tabboost-restored-content">${getMessage("contentTooLarge")}</div></body></html>`;
      }
      document.body.setAttribute(
        "data-tabboost-original-content",
        originalContent
      );
    } catch (e) {
      console.error("TabBoost: Error storing original content", e);
    }

    const domOperations = () => {
      const fragment = document.createDocumentFragment();

      const splitViewContainer = document.createElement("div");
      splitViewContainer.id = "tabboost-split-view-container";

      splitViewContainer.classList.add("tabboost-initially-hidden");

      const controlBar = document.createElement("div");
      controlBar.id = "tabboost-split-controls";

      const closeButton = document.createElement("button");
      closeButton.id = "tabboost-split-close";
      closeButton.innerText = getMessage("closeSplitView");
      closeButton.dataset.action = "close-split-view";

      controlBar.appendChild(closeButton);
      splitViewContainer.appendChild(controlBar);

      const viewsContainer = document.createElement("div");
      viewsContainer.id = "tabboost-views-container";

      const leftView = document.createElement("div");
      leftView.id = "tabboost-split-left";

      const leftCloseButton = document.createElement("button");
      leftCloseButton.className = "tabboost-view-close";
      leftCloseButton.innerText = "×";
      leftCloseButton.title = getMessage("closeLeftView");
      leftCloseButton.dataset.action = "close-left-view";

      leftView.appendChild(leftCloseButton);

      const leftErrorContainer = document.createElement("div");
      leftErrorContainer.id = "tabboost-left-error";
      leftErrorContainer.className = "tabboost-iframe-error";
      leftErrorContainer.innerHTML = `
        <div class="tabboost-error-content">
          <h3>${getMessage("cannotLoadInSplitView")}</h3>
          <p>${getMessage("websiteNotAllowed")}</p>
          <button class="tabboost-open-in-tab" data-url="${leftUrl}">${getMessage("openInNewTab")}</button>
          <button class="tabboost-add-to-ignore" data-url="${leftUrl}">${getMessage("addToIgnoreList")}</button>
        </div>
      `;
      leftView.appendChild(leftErrorContainer);

      const leftIframe = document.createElement("iframe");
      leftIframe.id = "tabboost-left-iframe";
      leftIframe.setAttribute("loading", "lazy");
      leftIframe.setAttribute(
        "sandbox",
        "allow-same-origin allow-scripts allow-popups allow-forms"
      );
      leftIframe.src = leftUrl;

      try {
        leftIframe.addEventListener("load", () => {
          try {
            leftErrorContainer.style.display = "none";
          } catch (e) {}
        });

        leftIframe.addEventListener("error", () => {
          try {
            leftErrorContainer.style.display = "flex";
          } catch (e) {}
        });
      } catch (e) {}

      leftView.appendChild(leftIframe);

      const rightView = document.createElement("div");
      rightView.id = "tabboost-split-right";

      const rightCloseButton = document.createElement("button");
      rightCloseButton.className = "tabboost-view-close";
      rightCloseButton.innerText = "×";
      rightCloseButton.title = getMessage("closeRightView");
      rightCloseButton.dataset.action = "close-right-view";

      rightView.appendChild(rightCloseButton);

      const rightErrorContainer = document.createElement("div");
      rightErrorContainer.id = "tabboost-right-error";
      rightErrorContainer.className = "tabboost-iframe-error";
      rightErrorContainer.innerHTML = `
        <div class="tabboost-error-content">
          <h3>${getMessage("cannotLoadInSplitView")}</h3>
          <p>${getMessage("websiteNotAllowed")}</p>
          <button class="tabboost-open-in-tab" data-url="">${getMessage("openInNewTab")}</button>
          <button class="tabboost-add-to-ignore" data-url="">${getMessage("addToIgnoreList")}</button>
        </div>
      `;
      rightView.appendChild(rightErrorContainer);

      const rightIframe = document.createElement("iframe");
      rightIframe.id = "tabboost-right-iframe";
      rightIframe.setAttribute("loading", "lazy");
      rightIframe.setAttribute(
        "sandbox",
        "allow-same-origin allow-scripts allow-popups allow-forms"
      );
      rightIframe.src = "about:blank";

      try {
        rightIframe.addEventListener("load", () => {
          try {
            if (rightIframe.src !== "about:blank") {
              rightErrorContainer.style.display = "none";
            }
          } catch (e) {}
        });

        rightIframe.addEventListener("error", () => {
          try {
            rightErrorContainer.style.display = "flex";
            const openButton = rightErrorContainer.querySelector(
              ".tabboost-open-in-tab"
            );
            if (openButton) {
              openButton.dataset.url = rightIframe.src;
            }
          } catch (e) {}
        });
      } catch (e) {}

      rightIframe.onerror = () => {
        rightErrorContainer.style.display = "flex";
        const openButton = rightErrorContainer.querySelector(
          ".tabboost-open-in-tab"
        );
        if (openButton) {
          openButton.dataset.url = rightIframe.src;
        }
      };

      setTimeout(() => {
        if (
          rightIframe.src !== "about:blank" &&
          (rightIframe.contentDocument === null ||
            rightIframe.contentWindow === null)
        ) {
          rightErrorContainer.style.display = "flex";
        }
      }, 5000);

      rightView.appendChild(rightIframe);

      const divider = document.createElement("div");
      divider.id = "tabboost-split-divider";

      viewsContainer.appendChild(leftView);
      viewsContainer.appendChild(divider);
      viewsContainer.appendChild(rightView);
      splitViewContainer.appendChild(viewsContainer);

      fragment.appendChild(splitViewContainer);

      const bodyRef = document.body;
      bodyRef.style.overflow = "hidden";

      try {
        while (bodyRef.firstChild) {
          bodyRef.removeChild(bodyRef.firstChild);
        }

        bodyRef.appendChild(fragment);
      } catch (e) {
        Array.from(bodyRef.children).forEach((child) => {
          child.style.display = "none";
        });
        bodyRef.appendChild(fragment);
      }

      requestAnimationFrame(() => {
        splitViewContainer.classList.remove("tabboost-initially-hidden");
        splitViewContainer.classList.add("tabboost-visible");
      });
    };

    domOperations();

    document.addEventListener("click", (event) => {
      const target = event.target;

      if (
        target.closest(
          '#tabboost-split-close, [data-action="close-split-view"]'
        )
      ) {
        chrome.runtime.sendMessage({ action: "closeSplitView" });
        return;
      }

      if (
        target.closest('.tabboost-view-close[data-action="close-left-view"]')
      ) {
        const rightIframe = document.getElementById("tabboost-right-iframe");

        if (
          rightIframe &&
          rightIframe.src &&
          rightIframe.src !== "about:blank"
        ) {
          const rightUrl = rightIframe.src;

          chrome.runtime.sendMessage({ action: "closeSplitView" });

          setTimeout(() => {
            window.location.href = rightUrl;
          }, 100);
        } else {
          chrome.runtime.sendMessage({ action: "closeSplitView" });
        }
        return;
      }

      if (
        target.closest('.tabboost-view-close[data-action="close-right-view"]')
      ) {
        const rightIframe = document.getElementById("tabboost-right-iframe");
        if (rightIframe) {
          rightIframe.src = "about:blank";

          const rightError = document.getElementById("tabboost-right-error");
          if (rightError) {
            rightError.style.display = "none";
          }

          const leftView = document.getElementById("tabboost-split-left");
          const rightView = document.getElementById("tabboost-split-right");
          const divider = document.getElementById("tabboost-split-divider");

          if (leftView && rightView && divider) {
            leftView.style.width = "100%";
            rightView.style.display = "none";
            divider.style.display = "none";
          }
        }
        return;
      }

      const openTabButton = target.closest(".tabboost-open-in-tab");
      if (openTabButton) {
        const url = openTabButton.dataset.url;
        if (url) {
          window.open(url, "_blank");
        }
        return;
      }

      const addToIgnoreButton = target.closest(".tabboost-add-to-ignore");
      if (addToIgnoreButton) {
        const url = addToIgnoreButton.dataset.url;
        if (url) {
          try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;

            chrome.runtime.sendMessage({
              action: "openInNewTab",
              url: url,
            });

            storageCache.get(["iframeIgnoreList"]).then((result) => {
              let ignoreList = result.iframeIgnoreList || [];

              if (!Array.isArray(ignoreList)) {
                ignoreList = [];
              }

              if (!ignoreList.includes(hostname)) {
                ignoreList.push(hostname);

                storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
                  alert(
                    getMessage("addedToIgnoreList", hostname) ||
                      `${hostname} has been added to the ignore list, and it will be opened directly in a new tab next time.`
                  );
                });
              } else {
                alert(
                  getMessage("alreadyInIgnoreList", hostname) ||
                    `${hostname} is already in the ignore list.`
                );
              }
            });
          } catch (error) {
            alert(
              getMessage("failedToAddToIgnoreList") ||
                "Failed to add to ignore list"
            );

            window.open(url, "_blank");
          }
        }
        return;
      }
    });
  } catch (error) {
    try {
      document.body.innerHTML = `<div class="tabboost-error">${getMessage("failedToInitSplitView") || "Failed to initialize split view, please refresh the page"}</div>`;
    } catch (e) {}
  }
}

export function removeSplitViewDOM() {
  try {
    if (!document || !document.body) {
      return;
    }

    let originalContent = "";
    try {
      originalContent =
        document.body.getAttribute("data-tabboost-original-content") || "";
    } catch (e) {}

    if (originalContent) {
      try {
        const parser = new DOMParser();
        const originalDoc = parser.parseFromString(
          originalContent,
          "text/html"
        );

        try {
          document.documentElement.innerHTML =
            originalDoc.documentElement.innerHTML;
        } catch (e) {
          try {
            document.body.innerHTML = originalDoc.body.innerHTML;
          } catch (e2) {
            document.body.innerHTML = `<div class="tabboost-error">${getMessage("failedToRestoreOriginal")}</div>`;
          }
        }
      } catch (e) {
        document.body.innerHTML = `
          <div class="tabboost-error">
            <p>${getMessage("failedToRestoreOriginal")}</p>
            <button onclick="window.location.reload()">${getMessage("refreshPage")}</button>
          </div>
        `;
      }
    } else {
      document.body.innerHTML = `
        <div class="tabboost-error">
          <p>${getMessage("cannotFindOriginalContent")}</p>
          <button onclick="window.location.reload()">${getMessage("refreshPage")}</button>
        </div>
      `;
    }
  } catch (error) {
    try {
      document.body.innerHTML = `
        <div class="tabboost-error">
          <p>${getMessage("failedToRestoreOriginal")}</p>
          <button onclick="window.location.reload()">${getMessage("refreshPage")}</button>
        </div>
      `;
    } catch (e) {}
  }
}

export function updateRightViewDOM(url) {
  try {
    if (!document || !document.body) {
      return;
    }

    const rightIframe = document.getElementById("tabboost-right-iframe");
    const rightErrorContainer = document.getElementById("tabboost-right-error");

    if (!rightIframe) {
      return;
    }

    let hasHandledFailure = false;

    const handleLoadFailure = (reason) => {
      if (hasHandledFailure) return;
      hasHandledFailure = true;

      if (rightErrorContainer) {
        rightErrorContainer.style.display = "flex";

        const openButton = rightErrorContainer.querySelector(
          ".tabboost-open-in-tab"
        );
        if (openButton) {
          openButton.dataset.url = url;
        }

        const addToIgnoreButton = rightErrorContainer.querySelector(
          ".tabboost-add-to-ignore"
        );
        if (addToIgnoreButton) {
          addToIgnoreButton.dataset.url = url;
        }
      }

      storageCache.get(["autoAddToIgnoreList"]).then((result) => {
        if (result.autoAddToIgnoreList) {
          try {
            storageCache.get(["iframeIgnoreList"]).then((result) => {
              let ignoreList = result.iframeIgnoreList || [];

              if (!Array.isArray(ignoreList)) {
                ignoreList = [];
              }

              const hostname = url
                .split("/")
                .pop()
                .split(".")
                .slice(-2)
                .join(".");
              if (!ignoreList.includes(hostname)) {
                ignoreList.push(hostname);

                storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
                  if (rightErrorContainer) {
                    const autoAddNotice = document.createElement("div");
                    autoAddNotice.className = "tabboost-auto-add-notice";
                    autoAddNotice.textContent = getMessage(
                      "autoAddedToIgnoreList",
                      hostname
                    );
                    rightErrorContainer.appendChild(autoAddNotice);
                  }
                });
              }
            });
          } catch (error) {}
        }
      });
    };

    try {
      rightIframe.onerror = () => {
        handleLoadFailure(getMessage("splitViewErrorIframeEvent"));
      };

      rightIframe.onload = () => {
        try {
          if (
            rightIframe.contentDocument === null ||
            rightIframe.contentWindow === null
          ) {
            handleLoadFailure(getMessage("splitViewErrorCannotAccessContent"));
            return;
          }

          const iframeContent =
            rightIframe.contentDocument.documentElement.innerHTML || "";
          if (
            iframeContent.includes("refused to connect") ||
            iframeContent.includes("Refuse connection") ||
            iframeContent.includes("ERR_CONNECTION_REFUSED")
          ) {
            handleLoadFailure(getMessage("splitViewErrorRefusedConnect"));
            return;
          }

          if (rightErrorContainer) {
            rightErrorContainer.style.display = "none";
          }
        } catch (e) {
          if (rightErrorContainer) {
            rightErrorContainer.style.display = "none";
          }
        }
      };

      rightIframe.src = url;
    } catch (e) {
      handleLoadFailure(getMessage("splitViewErrorFailedSetSource"));

      try {
        if (rightIframe.contentWindow) {
          rightIframe.contentWindow.location.href = url;
        }
      } catch (navError) {}
    }

    if (rightErrorContainer) {
      try {
        const openButton = rightErrorContainer.querySelector(
          ".tabboost-open-in-tab"
        );
        if (openButton) {
          openButton.dataset.url = url;
        }

        const addToIgnoreButton = rightErrorContainer.querySelector(
          ".tabboost-add-to-ignore"
        );
        if (addToIgnoreButton) {
          addToIgnoreButton.dataset.url = url;
        }
      } catch (e) {}
    }

    setTimeout(() => {
      if (!hasHandledFailure) {
        if (
          rightIframe.contentDocument === null ||
          rightIframe.contentWindow === null
        ) {
          handleLoadFailure(getMessage("splitViewErrorLoadTimeout"));
        } else {
          try {
            const iframeContent =
              rightIframe.contentDocument.documentElement.innerHTML || "";
            if (
              iframeContent.includes("refused to connect") ||
              iframeContent.includes("Refuse connection") ||
              iframeContent.includes("ERR_CONNECTION_REFUSED")
            ) {
              handleLoadFailure(getMessage("splitViewErrorRefusedConnect"));
            }
          } catch (e) {}
        }
      }
    }, 5000);

    let checkCount = 0;
    const checkInterval = setInterval(() => {
      checkCount++;

      if (hasHandledFailure || checkCount >= 5) {
        clearInterval(checkInterval);
        return;
      }

      try {
        if (
          rightIframe.contentDocument === null ||
          rightIframe.contentWindow === null
        ) {
          return;
        }

        const iframeContent =
          rightIframe.contentDocument.documentElement.innerHTML || "";
        if (
          iframeContent.includes("refused to connect") ||
          iframeContent.includes("Refuse connection") ||
          iframeContent.includes("ERR_CONNECTION_REFUSED")
        ) {
          handleLoadFailure(getMessage("splitViewErrorDetectedRefused"));
          clearInterval(checkInterval);
        }
      } catch (e) {}
    }, 1000);
  } catch (error) {
    try {
      chrome.runtime.sendMessage({
        action: "openInNewTab",
        url: url,
      });
    } catch (msgError) {}
  }
}

async function restoreOriginalContent() {
  const originalContent = document.body.getAttribute(
    "data-tabboost-original-content"
  );

  try {
    if (originalContent) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = originalContent;
      const restoredContentDiv = tempDiv.querySelector(
        ".tabboost-restored-content"
      );

      if (
        restoredContentDiv &&
        restoredContentDiv.textContent === getMessage("contentTooLarge")
      ) {
        window.location.reload();
        return;
      }

      document.documentElement.innerHTML = originalContent;
      window.location.reload();
    } else {
      document.body.innerHTML = `<div class="tabboost-error">${getMessage("cannotFindOriginalContent")}</div><button onclick="window.location.reload()">${getMessage("refreshPage")}</button>`;
      addErrorStyles();
    }
  } catch (error) {
    console.error("Failed to restore original content:", error);
    document.body.innerHTML = `<div class="tabboost-error">${getMessage("failedToRestoreOriginal")}</div><button onclick="window.location.reload()">${getMessage("refreshPage")}</button>`;
    addErrorStyles();
  } finally {
    document.body.removeAttribute("data-tabboost-original-content");
    document.body.style.overflow = "";
  }
}

function addErrorStyles() {
  const style = document.createElement("style");
  style.textContent = `
      .tabboost-error { 
         padding: 20px; 
         color: #721c24; 
         background-color: #f8d7da; 
         border: 1px solid #f5c6cb; 
         border-radius: 4px; 
         margin: 20px; 
         font-family: sans-serif;
      }
      .tabboost-error + button {
         margin: 0 20px 20px 20px;
         padding: 10px 15px;
         cursor: pointer;
      }
   `;
  document.head.appendChild(style);
}
