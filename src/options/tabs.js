document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      const tabId = tab.getAttribute("data-tab");
      document.getElementById(`${tabId}-content`).classList.add("active");
    });
  });
});
