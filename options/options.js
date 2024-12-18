const saveButton = document.getElementById("saveButton");
const duplicateTabShortcutInput = document.getElementById(
  "duplicateTabShortcut"
);
const copyUrlShortcutInput = document.getElementById("copyUrlShortcut");

// 保存设置
saveButton.addEventListener("click", () => {
  const duplicateTabShortcut = duplicateTabShortcutInput.value;
  const copyUrlShortcut = copyUrlShortcutInput.value;

  chrome.storage.sync.set(
    {
      duplicateTabShortcut: duplicateTabShortcut,
      copyUrlShortcut: copyUrlShortcut,
    },
    () => {
      alert("设置已保存!");
    }
  );
});

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(
    ["duplicateTabShortcut", "copyUrlShortcut"],
    (result) => {
      duplicateTabShortcutInput.value = result.duplicateTabShortcut || "Ctrl+M";
      copyUrlShortcutInput.value = result.copyUrlShortcut || "Shift+Ctrl+C";
    }
  );
}

loadSettings();
