const saveButton = document.getElementById("saveButton");
const duplicateTabShortcutInput = document.getElementById(
  "duplicateTabShortcut"
);
const copyUrlShortcutInput = document.getElementById("copyUrlShortcut");
const defaultActionInput = document.getElementById("defaultAction");

// 保存设置
saveButton.addEventListener("click", () => {
  const duplicateTabShortcut = duplicateTabShortcutInput.value;
  const copyUrlShortcut = copyUrlShortcutInput.value;
  const defaultAction = defaultActionInput.value;

  chrome.storage.sync.set(
    {
      duplicateTabShortcut: duplicateTabShortcut,
      copyUrlShortcut: copyUrlShortcut,
      defaultAction: defaultAction,
    },
    () => {
      alert("设置已保存!");
    }
  );
});

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(
    ["duplicateTabShortcut", "copyUrlShortcut", "defaultAction"],
    (result) => {
      duplicateTabShortcutInput.value = result.duplicateTabShortcut || "Ctrl+M";
      copyUrlShortcutInput.value = result.copyUrlShortcut || "Shift+Ctrl+C";
      defaultActionInput.value = result.defaultAction;
    }
  );
}

loadSettings();
