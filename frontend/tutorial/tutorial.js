// Tutorial theme toggle — shared across all pages. No dependencies.
// Persists the choice in localStorage so it survives navigation between pages.
(function () {
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  function currentTheme() {
    return (
      document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  }
  window.toggleTheme = function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("tutorial-theme", next);
    } catch (e) {}
  };
  // Apply the saved theme as early as possible (script is in <head> or end of body).
  try {
    var saved = localStorage.getItem("tutorial-theme");
    if (saved) applyTheme(saved);
  } catch (e) {}
})();
