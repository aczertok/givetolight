/* Live campaign interactions — all figures and people come from server-provided campaign data. */
(() => {
  "use strict";
  const seed = document.getElementById("campaign-data");
  if (!seed) return;
  let data;
  try { data = JSON.parse(seed.textContent || "{}"); } catch { return; }
  const campaign = data.slug || "volley2027";
  const ambassadors = Array.isArray(data.ambassadors) ? data.ambassadors : [];
  const teams = Array.isArray(data.teams) ? data.teams : [];
  const live = data.status === "live";
  const choices = [...new Set((data.presets || [72,180,360,1000]).filter(n => Number.isFinite(n) && n >= 1 && n <= 250000))].slice(0,4);
  if (!choices.length) choices.push(72,180,360,1000);
  const state = { amount: choices[Math.min(1,choices.length-1)], period: "once", allAmb: false, allTeams: false };
  const dollars = n => "$" + Number(n || 0).toLocaleString("en-US",{maximumFractionDigits:2});
  const esc = s => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const $ = id => document.getElementById(id);
  const initials = name => (String(name || "").trim().split(/\s+/).slice(0,2).map(w => w[0] || "").join("").toUpperCase() || "♥");
  const personUrl = (type, x) => "/" + encodeURIComponent(campaign) + (type === "team" ? "/team/" : "/") + encodeURIComponent(x.slug);
  const donateUrl = (type, x) => {
    const p = new URLSearchParams({ amount: String(state.amount), plan: state.period });
    if (type && x) p.set(type === "team" ? "t" : "a", x.slug);
    return "/" + encodeURIComponent(campaign) + "/donate?" + p.toString();
  };
  function proceed(type, x) {
    if (!live || !(state.amount >= 1 && state.amount <= 250000)) return;
    window.location.assign(donateUrl(type, x));
  }
  function card(x, type, index) {
    const thumb = type === "team"
      ? (x.photo_url ? '<div class="avatar"><img src="' + esc(x.photo_url) + '" alt=""></div>' : '<div class="jersey">' + (index+1) + '</div>')
      : (x.photo_url ? '<div class="avatar"><img src="' + esc(x.photo_url) + '" alt=""></div>' : '<div class="avatar">' + esc(initials(x.name)) + '</div>');
    const url = personUrl(type,x);
    const raised = Number(x.raised || 0);
    return '<article class="profile"><div class="profile-top">' + thumb + '<div class="name">' + esc(x.name) +
      '</div></div><div class="raised">' + dollars(raised) +
      '<small>raised' + (x.goal ? ' · ' + Math.round(raised / Number(x.goal) * 100) + '% of goal' : '') +
      '</small></div><div class="card-buttons"><button type="button" data-view="' + esc(url) +
      '">View ' + (type === "team" ? "team" : "page") + '</button>' +
      (live ? '<button type="button" class="give" data-donate-type="' + type + '" data-donate-slug="' + esc(x.slug) +
      '">Donate</button>' : '') + '</div></article>';
  }
  function renderPeople() {
    const groups = [
      ["ambassador", ambassadors, "ambassador-search", "ambassador-grid", state.allAmb],
      ["team", teams, "team-search", "team-grid", state.allTeams],
    ];
    for (const [type, items, searchId, gridId, showAll] of groups) {
      const target = $(gridId), input = $(searchId);
      if (!target) continue;
      const query = (input ? input.value : "").trim().toLowerCase();
      const filtered = items.filter(x => x.name.toLowerCase().includes(query));
      const visible = showAll || query ? filtered : filtered.slice(0,3);
      target.innerHTML = visible.length
        ? visible.map((x,i) => card(x,type,i)).join("")
        : '<p class="empty">' + (query ? "No matching " + (type === "team" ? "teams" : "ambassadors") + ". Try another name." : "No " + (type === "team" ? "teams" : "ambassadors") + " yet.") + '</p>';
    }
  }
  function updateAmount() {
    document.querySelectorAll("[data-amount]").forEach(b => b.classList.toggle("on",Number(b.dataset.amount) === state.amount));
    document.querySelectorAll("[data-period]").forEach(b => b.classList.toggle("on",b.dataset.period === state.period));
    const label = "Donate " + dollars(state.amount) + (state.period === "monthly" ? " monthly" : "") + " →";
    const main = $("donate-main"), sticky = $("sticky-donate"), val = $("sticky-value");
    if (main) { main.textContent = live ? label : "Donations are not open"; main.disabled = !live; }
    if (sticky) { sticky.textContent = live ? label : "Donations are not open"; sticky.disabled = !live; }
    if (val) val.textContent = dollars(state.amount);
  }
  document.querySelectorAll("[data-amount]").forEach((button,i) => {
    if (i < choices.length) { button.dataset.amount = String(choices[i]); button.textContent = dollars(choices[i]); }
    else button.style.display = "none";
    button.addEventListener("click",() => {
      state.amount = Number(button.dataset.amount);
      const custom = $("custom-amount"); if (custom) custom.value = "";
      updateAmount();
    });
  });
  document.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click",() => {
    state.period = button.dataset.period;
    updateAmount();
  }));
  const custom = $("custom-amount");
  if (custom) custom.addEventListener("input",() => {
    const n = Number(custom.value);
    if (custom.value !== "" && Number.isFinite(n) && n >= 1 && n <= 250000) {
      state.amount = Math.round(n * 100)/100; updateAmount();
      custom.setCustomValidity("");
    } else if (custom.value) custom.setCustomValidity("Enter an amount between $1 and $250,000.");
    else custom.setCustomValidity("");
  });
  for (const search of ["ambassador-search","team-search"]) {
    if ($(search)) $(search).addEventListener("input",renderPeople);
  }
  const ambAll = $("all-ambassadors"), teamsAll = $("all-teams");
  if (ambAll) ambAll.addEventListener("click",() => {
    state.allAmb = !state.allAmb;
    ambAll.textContent = state.allAmb ? "Show less ↑" : "View all →";
    renderPeople();
  });
  if (teamsAll) teamsAll.addEventListener("click",() => {
    state.allTeams = !state.allTeams;
    teamsAll.textContent = state.allTeams ? "Show less ↑" : "View all →";
    renderPeople();
  });
  for (const el of [$("ambassador-grid"),$("team-grid")]) {
    if (!el) continue;
    el.addEventListener("click",e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.dataset.view) return window.location.assign(btn.dataset.view);
      if (btn.dataset.donateType) {
        const type = btn.dataset.donateType;
        const person = (type === "team" ? teams : ambassadors).find(x => x.slug === btn.dataset.donateSlug);
        if (person) proceed(type,person);
      }
    });
  }
  const main = $("donate-main"), sticky = $("sticky-donate");
  if (main) main.addEventListener("click",() => proceed(null,null));
  if (sticky) sticky.addEventListener("click",() => proceed(null,null));
  const join = $("amb-join");
  if (join) join.addEventListener("click",() => window.location.assign("/" + encodeURIComponent(campaign) + "/join"));
  const menuToggle = $("menu-toggle"), menu = $("menu");
  if (menuToggle && menu) {
    menuToggle.addEventListener("click",() => {
      const show = !menu.classList.contains("open");
      menu.classList.toggle("open",show);
      menuToggle.setAttribute("aria-expanded",String(show));
    });
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click",() => {
      menu.classList.remove("open"); menuToggle.setAttribute("aria-expanded","false");
    }));
  }
  const raw = document.querySelector(".hero .lead");
  if (raw && data.tagline && data.tagline.trim()) raw.textContent = data.tagline;
  if (!data.dafAvailable) document.querySelectorAll(".method.daf").forEach(el => el.remove());
  updateAmount();
  renderPeople();
})();
