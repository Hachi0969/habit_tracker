// Applies the saved theme before React loads so the page never flashes the wrong colours.
try {
  if (localStorage.getItem("ld-theme") === "light") document.documentElement.classList.remove("dark");
} catch {
  /* storage blocked: keep dark default */
}
