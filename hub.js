(() => {
  const catalog = Array.isArray(window.APP_CATALOG) ? window.APP_CATALOG : [];
  const groups = document.getElementById("catalogGroups");
  const search = document.getElementById("searchInput");
  const count = document.getElementById("catalogCount");
  const empty = document.getElementById("emptyState");
  const more = document.getElementById("catalogMore");
  const previewLimit = 6;
  let expanded = false;
  const randomBtn = document.getElementById("randomBtn");
  const pinStatus = document.getElementById("pinStatus");
  const filters = [...document.querySelectorAll("[data-filter]")];
  const sections = [{ type: "game", title: "Games" }, { type: "tool", title: "Tools" }];
  const pinKey = "ben-hub-pins-v1";
  const validIds = new Set(catalog.map(item => item.id));
  const lower = value => String(value ?? "").toLowerCase();
  const searchText = new Map(catalog.map(item => [item.id,
    [item.title, item.description, item.meta, item.detail, item.type].map(lower).join(" ")
  ]));
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  let activeFilter = "all";
  let pinned = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(pinKey));
    if (Array.isArray(saved)) pinned = new Set(saved.filter(id => validIds.has(id)));
  } catch { /* Pins still work for this visit when storage is unavailable. */ }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function updatePin(button, item) {
    const isPinned = pinned.has(item.id);
    button.setAttribute("aria-pressed", String(isPinned));
    button.setAttribute("aria-label", `${isPinned ? "Unpin" : "Pin"} ${item.title}`);
    button.title = `${isPinned ? "Unpin" : "Pin"} ${item.title}`;
    button.textContent = isPinned ? "★" : "☆";
  }

  function entryFor(item) {
    const entry = element("li", "entry");
    entry.dataset.appId = item.id;
    const link = element("a", "entry-link");
    link.href = item.href;
    link.append(
      element("h3", "entry-title", item.title),
      element("p", "entry-description", item.description),
      element("p", "entry-meta", item.meta)
    );
    const pin = element("button", "pin-button");
    pin.type = "button";
    pin.dataset.pinId = item.id;
    updatePin(pin, item);
    pin.addEventListener("click", () => {
      if (pinned.has(item.id)) pinned.delete(item.id);
      else pinned.add(item.id);
      try {
        localStorage.setItem(pinKey, JSON.stringify([...pinned]));
        pinStatus.hidden = true;
      } catch {
        pinStatus.textContent = "Pins work for this visit, but this browser couldn't save them.";
        pinStatus.hidden = false;
      }
      if (activeFilter === "pinned") {
        const oldButtons = [...groups.querySelectorAll(".pin-button")];
        const index = oldButtons.indexOf(pin);
        render();
        const remaining = [...groups.querySelectorAll(".pin-button")];
        (remaining[Math.min(index, remaining.length - 1)] || filters.find(button => button.dataset.filter === "pinned")).focus();
      } else {
        updatePin(pin, item);
      }
    });
    entry.append(link, pin);
    return entry;
  }

  function groupFor(section, items) {
    const group = element("section", "catalog-group");
    group.dataset.kind = section.type;
    group.setAttribute("aria-labelledby", `${section.type}Title`);
    const title = element("h2", "group-heading", section.title);
    title.id = `${section.type}Title`;
    const total = element("span", "group-count", String(items.length));
    total.setAttribute("aria-hidden", "true");
    title.append(total);
    const list = element("ul", "entry-list");
    list.append(...items.map(entryFor));
    group.append(title, list);
    return group;
  }

  function preview(items) {
    if (activeFilter !== "all") return items.slice(0, previewLimit);
    // Keep both categories discoverable in the six-entry overview.
    const selected = new Set([
      ...items.filter(item => item.type === "game").slice(0, 4),
      ...items.filter(item => item.type === "tool").slice(0, 2)
    ]);
    for (const item of items) {
      if (selected.size >= previewLimit) break;
      selected.add(item);
    }
    return items.filter(item => selected.has(item));
  }

  function render() {
    const query = lower(search.value).trim();
    const items = catalog.filter(item => {
      const matchesType = activeFilter === "all" || item.type === activeFilter || (activeFilter === "pinned" && pinned.has(item.id));
      return matchesType && (!query || searchText.get(item.id).includes(query));
    });
    const canExpand = !query && items.length > previewLimit;
    const visible = canExpand && !expanded ? preview(items) : items;
    groups.replaceChildren(...sections.flatMap(section => {
      const matches = visible.filter(item => item.type === section.type);
      return matches.length ? [groupFor(section, matches)] : [];
    }));
    empty.hidden = items.length !== 0;
    const noPins = activeFilter === "pinned" && pinned.size === 0;
    document.getElementById("emptyTitle").textContent = noPins ? "Nothing pinned yet." : "No matches.";
    document.getElementById("emptyHelp").textContent = noPins ? "Use the star next to a game or tool to keep it here." : "Try a different search or choose another category.";
    const games = items.filter(item => item.type === "game").length;
    const tools = items.filter(item => item.type === "tool").length;
    const kind = activeFilter === "game" ? "games" : activeFilter === "tool" ? "tools" : "games and tools";
    count.textContent = visible.length < items.length
      ? `Showing ${visible.length} of ${items.length} ${kind}.`
      : items.length ? `${plural(games, "game")} and ${plural(tools, "tool")} shown.` : (noPins ? "Nothing pinned yet." : "No matches.");
    more.hidden = !canExpand;
    more.textContent = expanded ? "Show fewer" : `Show all ${items.length}`;
    more.setAttribute("aria-expanded", String(canExpand && expanded));
    filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter)));
  }

  more.addEventListener("click", () => {
    const previousIds = new Set([...groups.querySelectorAll(".entry")].map(entry => entry.dataset.appId));
    expanded = !expanded;
    render();
    if (expanded) {
      // Start keyboard reading at the first newly revealed entry.
      [...groups.querySelectorAll(".entry")].find(entry => !previousIds.has(entry.dataset.appId))?.querySelector(".entry-link").focus();
    }
  });
  filters.forEach(button => button.addEventListener("click", () => {
    expanded = false;
    activeFilter = button.dataset.filter;
    render();
  }));
  search.addEventListener("input", () => {
    expanded = false;
    render();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    search.value = "";
    expanded = false;
    activeFilter = "all";
    render();
    search.focus();
  });
  document.addEventListener("keydown", event => {
    const target = event.target;
    const isEditing = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (event.key === "/" && !isEditing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      expanded = false;
      search.value = "";
      render();
      search.blur();
    }
  });
  randomBtn.addEventListener("click", () => {
    const games = catalog.filter(item => item.type === "game");
    if (games.length) window.location.href = games[Math.floor(Math.random() * games.length)].href;
  });

  const games = catalog.filter(item => item.type === "game").length;
  document.getElementById("footerCount").textContent = `${plural(games, "game")} / ${plural(catalog.length - games, "tool")}`;
  render();
  document.getElementById("catalogControls").hidden = false;
  randomBtn.hidden = games === 0;
})();
