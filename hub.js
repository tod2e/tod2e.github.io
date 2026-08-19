(() => {
  const catalog = Array.isArray(window.APP_CATALOG) ? window.APP_CATALOG : [];
  const grid = document.getElementById("catalogGrid");
  const template = document.getElementById("catalogCardTemplate");
  const search = document.getElementById("searchInput");
  const count = document.getElementById("catalogCount");
  const footerCount = document.getElementById("footerCount");
  const empty = document.getElementById("emptyState");
  const randomBtn = document.getElementById("randomBtn");
  const filters = [...document.querySelectorAll("[data-filter]")];

  let activeFilter = "all";
  const lower = (v) => String(v ?? "").toLowerCase();

  function filteredItems() {
    const q = lower(search.value).trim();
    return catalog.filter(item => {
      const kindMatch = activeFilter === "all" || item.type === activeFilter;
      const haystack = [item.title, item.description, item.meta, item.detail, item.type].map(lower).join(" ");
      return kindMatch && (!q || haystack.includes(q));
    });
  }

  function cardFor(item) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.href = item.href;
    node.querySelector(".kind-pill").textContent = item.type;
    node.querySelector(".meta-text").textContent = item.meta || "";
    node.querySelector(".card-title").textContent = item.title;
    node.querySelector(".card-description").textContent = item.description || "";
    node.querySelector(".card-detail").textContent = item.detail || "";
    node.querySelector(".art-label").textContent = item.artLabel || item.type;
    node.querySelector(".art-mark").textContent = item.mark || "↗";

    const art = node.querySelector(".card-art");
    art.style.setProperty("--art-a", item.artA || "#533d2d");
    art.style.setProperty("--art-b", item.artB || "#191512");
    art.style.setProperty("--glow", item.glow || "rgba(193,138,90,.55)");
    return node;
  }

  function render() {
    const items = filteredItems();
    grid.replaceChildren(...items.map(cardFor));
    empty.classList.toggle("hidden", items.length !== 0);

    const games = items.filter(x => x.type === "game").length;
    const tools = items.filter(x => x.type === "tool").length;
    const parts = [];
    if (games) parts.push(`${games} game${games === 1 ? "" : "s"}`);
    if (tools) parts.push(`${tools} tool${tools === 1 ? "" : "s"}`);
    count.textContent = parts.length ? parts.join(" · ") : "0 items";

    const totalGames = catalog.filter(x => x.type === "game").length;
    const totalTools = catalog.filter(x => x.type === "tool").length;
    footerCount.textContent =
      `${totalGames} game${totalGames === 1 ? "" : "s"}${totalTools ? ` · ${totalTools} tool${totalTools === 1 ? "" : "s"}` : ""}`;
  }

  filters.forEach(btn => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      filters.forEach(x => x.classList.toggle("active", x === btn));
      render();
    });
  });

  search.addEventListener("input", render);

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== search) {
      event.preventDefault();
      search.focus();
      search.select();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      search.blur();
      render();
    }
  });

  randomBtn.addEventListener("click", () => {
    const games = catalog.filter(x => x.type === "game");
    if (!games.length) return;
    const choice = games[Math.floor(Math.random() * games.length)];
    window.location.href = choice.href;
  });

  render();
})();
