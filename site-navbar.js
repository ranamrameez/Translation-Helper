class SiteNavbar extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { display: block; position: relative; z-index: 30; }
        nav { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 18px; padding: 9px 16px;
          background: #fff; color: #212529; color-scheme: light; box-shadow: 0 2px 5px #0002;
          font: 16px/1.5 system-ui, sans-serif; }
        a { color: inherit; text-decoration: none; }
        .brand { color: #0d6efd; font-size: 20px; white-space: nowrap; }
        details { position: relative; }
        summary { cursor: pointer; padding: 6px 0; color: #495057; }
        ul { position: absolute; top: 100%; left: 0; list-style: none; min-width: 190px; width: max-content;
          max-width: calc(100vw - 36px); box-sizing: border-box; margin: 0; padding: 6px 0;
          background: #fff; border: 1px solid #d9dfe5; border-radius: 8px; box-shadow: 0 8px 20px #0002; }
        li a { display: block; padding: 6px 14px; }
        li a:hover, li a:focus-visible, [aria-current="page"] { background: #eaf2ff; color: #084298; }
        .tools { margin-left: auto; }
        @media (max-width: 760px) {
          .brand { flex: 1 0 100%; }
          ul { position: static; }
        }
      </style>
      <nav aria-label="Main navigation">
        <a class="brand" href="./">🔗 DigiRash Solutions</a>
        <details><summary>General Tools</summary><ul><li><a href="./">Translation Helper</a></li>
<li><a href="./Trade%20Journal.html">Trade Journal</a></li>
<li><a href="./psx-command-deck.html">PSX Profile</a></li>
<li><a href="https://github.com/ranamrameez/DesktopPortal/blob/master/Latest_Release/DesktopPortal.zip">Desktop Portal</a></li>
<li><a href="https://ranamrameez.github.io/formatly/">Formatly</a></li></ul></details>
        <details><summary>GIS Tools</summary><ul><li><a href="https://github.com/ranamrameez/Feature_Class_Export_Tool">Feature Class Export Tool</a></li>
<li><a href="https://github.com/ranamrameez/SymbolInsertTool">Import Symbols Into Style File</a></li></ul></details>
        <details><summary>Map Starters</summary><ul><li><a href="https://ranamrameez.github.io/leaflet_task/">Leaflet Map</a></li>
<li><a href="https://ranamrameez.github.io/mapbox/">Mapbox</a></li></ul></details>
        <details><summary>Libraries</summary><ul><li><a href="https://github.com/ranamrameez/LibrariesByRana">Libraries by Rana</a></li>
<li><a href="https://ranamrameez.github.io/LibrariesByRana/material-bs.css">Materialized CSS</a></li></ul></details>
        <span class="tools"><slot></slot></span>
      </nav>`;
    const current = { home: './', journal: './Trade%20Journal.html', deck: './psx-command-deck.html' };
    const page = current[this.getAttribute('page')];
    if (page) root.querySelector(`li a[href="${page}"]`).setAttribute('aria-current', 'page');

    const menus = [...root.querySelectorAll('details')];
    root.addEventListener('click', event => {
      const selected = event.target.closest('summary')?.parentElement;
      if (selected) menus.forEach(menu => { if (menu !== selected) menu.open = false; });
    });
    root.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const open = menus.find(menu => menu.open);
      if (open) {
        open.open = false;
        open.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', event => {
      if (!event.composedPath().includes(this)) menus.forEach(menu => { menu.open = false; });
    });
  }
}

customElements.define('site-navbar', SiteNavbar);
