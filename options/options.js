const saveButton = document.getElementById("saveButton");
const duplicateTabShortcutInput = document.getElementById(
  "duplicateTabShortcut"
);
const copyUrlShortcutInput = document.getElementById("copyUrlShortcut");
const splitViewShortcutInput = document.getElementById("splitViewShortcut");
const defaultActionInput = document.getElementById("defaultAction");
const splitViewEnabledCheckbox = document.getElementById("splitViewEnabled");

// 保存设置
saveButton.addEventListener("click", () => {
  const duplicateTabShortcut = duplicateTabShortcutInput.value;
  const copyUrlShortcut = copyUrlShortcutInput.value;
  const splitViewShortcut = splitViewShortcutInput.value;
  const defaultAction = defaultActionInput.value;
  const splitViewEnabled = splitViewEnabledCheckbox.checked;

  chrome.storage.sync.set(
    {
      duplicateTabShortcut: duplicateTabShortcut,
      copyUrlShortcut: copyUrlShortcut,
      splitViewShortcut: splitViewShortcut,
      defaultAction: defaultAction,
      splitViewEnabled: splitViewEnabled,
    },
    () => {
      alert("设置已保存!");
    }
  );
});

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(
    [
      "duplicateTabShortcut", 
      "copyUrlShortcut", 
      "splitViewShortcut", 
      "defaultAction", 
      "splitViewEnabled"
    ],
    (result) => {
      duplicateTabShortcutInput.value = result.duplicateTabShortcut || "Ctrl+M";
      copyUrlShortcutInput.value = result.copyUrlShortcut || "Shift+Ctrl+C";
      splitViewShortcutInput.value = result.splitViewShortcut || "Shift+Command+S";
      defaultActionInput.value = result.defaultAction || "copy-url";
      splitViewEnabledCheckbox.checked = result.splitViewEnabled !== undefined 
        ? result.splitViewEnabled 
        : true; // 默认启用
    }
  );
}

loadSettings();
