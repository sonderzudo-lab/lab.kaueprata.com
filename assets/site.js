(() => {
  "use strict";

  const apps = Array.isArray(window.KP_APPS) ? window.KP_APPS : [];
  const list = document.getElementById("app-list");
  const count = document.getElementById("app-count");
  const search = document.getElementById("app-search");
  const empty = document.getElementById("empty");

  const normalize = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const makeTag = (name) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = name;
    return tag;
  };

  const makeCard = (app, index) => {
    const article = document.createElement("article");
    article.className = "app-card";
    article.dataset.search = normalize([app.title, app.description, ...app.tags].join(" "));

    const link = document.createElement("a");
    link.className = "app-card-link";
    link.href = `/${app.slug}/`;
    link.setAttribute("aria-label", `Abrir ${app.title}`);

    const top = document.createElement("div");
    top.className = "app-topline";

    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(3, "0");

    const status = document.createElement("span");
    status.className = "status";
    status.textContent = app.status;
    top.append(number, status);

    const title = document.createElement("h3");
    title.textContent = app.title;

    const description = document.createElement("p");
    description.textContent = app.description;

    const bottom = document.createElement("div");
    bottom.className = "app-bottom";

    const tags = document.createElement("div");
    tags.className = "tags";
    app.tags.forEach((tag) => tags.appendChild(makeTag(tag)));

    const open = document.createElement("span");
    open.className = "open-app";
    open.textContent = "abrir app ↗";
    bottom.append(tags, open);

    link.append(top, title, description, bottom);
    article.appendChild(link);
    return article;
  };

  apps
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((app, index) => list.appendChild(makeCard(app, index)));

  const updateCount = () => {
    const visible = [...list.children].filter((card) => !card.hidden).length;
    count.textContent = `${visible} ${visible === 1 ? "projeto" : "projetos"}`;
    empty.hidden = visible !== 0;
  };

  search.addEventListener("input", () => {
    const query = normalize(search.value.trim());
    [...list.children].forEach((card) => {
      card.hidden = Boolean(query) && !card.dataset.search.includes(query);
    });
    updateCount();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== search) {
      event.preventDefault();
      search.focus();
    }
  });

  updateCount();
})();
