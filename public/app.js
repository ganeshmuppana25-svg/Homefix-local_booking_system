/* =========================================================
   HOMEFIX FRONTEND APP
   ========================================================= */
(function () {
  'use strict';

  /* ---------- State ---------- */
  const state = {
    user: null,
    services: [],
    providers: [],
    bookings: [],
    filters: { q: '', category: 'All', location: 'All', minRating: 0, maxPrice: 9999, availability: 'All' },
    activeProviderId: null
  };

  const $ = (sel) => document.querySelector(sel);
  const el = (id) => document.getElementById(id);

  /* ---------- API helper (relative paths only) ---------- */
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) {
      const err = new Error(data.error || 'Something went wrong.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- Escape HTML ---------- */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function initials(name) {
    return String(name || '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  function stars(n) {
    const r = Math.round(n);
    let s = '';
    for (let i = 0; i < 5; i++) s += i < r ? '★' : '☆';
    return s;
  }

  function money(n) { return '$' + Number(n || 0); }

  /* ---------- Dates ---------- */
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return d; }
  }

  /* ---------- Dark mode ---------- */
  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('homefix-theme', theme);
    const btn = $('#themeBtn');
    if (btn) btn.innerHTML = theme === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>';
  }
  function toggleTheme() {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  }

  /* ---------- Toast notifications ---------- */
  function toast(title, message, type = 'success') {
    const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
    const box = $('#toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="t-icon">${icons[type] || 'ℹ️'}</span>
      <div><b>${esc(title)}</b>${message ? `<span>${esc(message)}</span>` : ''}</div>`;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 350); }, 3400);
  }

  /* ---------- Modal helpers ---------- */
  function showModal(id) {
    const m = el(id);
    if (m) { m.hidden = false; document.body.style.overflow = 'hidden'; }
  }
  function closeModal(id) {
    const m = el(id);
    if (m) { m.hidden = true; document.body.style.overflow = ''; }
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach((m) => { m.hidden = true; });
    document.body.style.overflow = '';
  }
  function clearErrors() { document.querySelectorAll('.field-error').forEach((e) => { e.textContent = ''; }); }

  /* ---------- Service icon map ---------- */
  const SERVICE_ICON = {
    'Plumbing': '🔧', 'Electrical': '💡', 'Home Cleaning': '🧹', 'AC Repair': '❄️',
    'Appliance Repair': '🔌', 'Painting': '🎨', 'Carpentry': '🪚', 'Home Maintenance': '🛠️'
  };
  function iconFor(name) { return SERVICE_ICON[name] || '🔧'; }

  function iconForIconField(f) {
    const map = { plumbing: '🔧', electrical: '💡', cleaning: '🧹', ac: '❄️', appliance: '🔌', painting: '🎨', carpentry: '🪚', maintenance: '🛠️' };
    return map[(f || '').toLowerCase()] || '🔧';
  }

  function statusBadge(s) {
    const cls = String(s || '').replace(/\s+/g, '');
    return `<span class="status ${cls}">${esc(s)}</span>`;
  }

/* =========================================================
     NAVIGATION
     ========================================================= */
  function renderNav() {
    const logged = !!state.user;
    const u = state.user || {};

    const commonLinks = `
      <li><a href="#/home" data-route="home">Home</a></li>
      <li><a href="#/services" data-route="services">Services</a></li>
      <li><a href="#/providers" data-route="providers">Providers</a></li>
      <li><a href="#/bookings" data-route="bookings">Bookings</a></li>
      <li><a href="#/about" data-route="about">About</a></li>`;

    let actions;
    if (!logged) {
      actions = `
        <button class="btn btn-ghost btn-sm action-btn" data-action="login">Login</button>
        <button class="btn btn-primary btn-sm action-btn" data-action="register">Register</button>`;
    } else {
      actions = `
        <div class="nav-user action-btn" data-action="dashboard" title="Dashboard">
          <span class="nav-avatar">${esc(initials(u.fullName))}</span>
          <span class="u-name">${esc(u.fullName.split(' ')[0])}</span>
        </div>
        <button class="btn btn-outline btn-sm action-btn" data-action="logout">Logout</button>`;
    }

    $('#navBar').innerHTML = `
      <a class="logo" href="#/home"><span class="logo-mark">✦</span>HomeFix</a>
      <ul class="nav-links">${commonLinks}</ul>
      <div class="nav-actions">
        <button class="icon-btn theme-toggle action-btn" id="themeBtn" data-action="theme" aria-label="Toggle theme"></button>
        ${actions}
        <button class="nav-burger action-btn" data-action="menu" aria-label="Menu">☰</button>
      </div>`;

    const oldMenu = $('#mobileMenu');
    if (oldMenu) oldMenu.remove();
    const mm = document.createElement('div');
    mm.className = 'mobile-menu';
    mm.id = 'mobileMenu';
    mm.innerHTML = commonLinks.replace(/<li>|<\/li>/g, '') + `
      ${logged
        ? `<button class="action-btn" data-action="dashboard">Dashboard</button>
           <button class="action-btn" data-action="logout">Logout</button>`
        : `<button class="action-btn" data-action="login">Login</button>
           <button class="action-btn" data-action="register">Register</button>`}
      <button class="btn btn-outline action-btn" data-action="menu">Close</button>`;
    $('#navbar').appendChild(mm);

    applyTheme(localStorage.getItem('homefix-theme') || 'light');
    setActiveLink();
  }

  function setActiveLink() {
    const r = parseRoute();
    document.querySelectorAll('#navBar [data-route]').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-route') === r.name);
    });
  }

  /* =========================================================
     ROUTER
     ========================================================= */
  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/');
    return { name: parts[0] || 'home', id: parts[1] };
  }
  function navigate(to) { location.hash = '#/' + to; }

  function render() {
    const r = parseRoute();
    setActiveLink();
    const main = $('#mainView');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* scrollTo optional */ }

    switch (r.name) {
      case 'services': viewServices(main); break;
      case 'providers': viewProviders(main); break;
      case 'provider': viewProvider(main, r.id); break;
      case 'about': viewAbout(main); break;
      case 'bookings': viewBookings(main); break;
      case 'dashboard': viewDashboard(main); break;
      case 'profile': viewProfile(main); break;
      default: viewLanding(main);
    }
  }

/* =========================================================
     VIEW BUILDERS
     ========================================================= */
  function providerCard(p) {
    const avail = p.availability === 'Available' ? 'available' : 'busy';
    return `
      <div class="provider-card">
        <div class="provider-top">
          <span class="avatar">${esc(p.avatar || initials(p.name))}</span>
          <div>
            <h3>${esc(p.name)} ${p.verified ? '<span class="badge badge-verified">✓ Verified</span>' : ''}</h3>
            <div class="role-tag">${esc(p.service)}</div>
            <span class="rating">★ ${p.rating} <span style="color:var(--muted);font-weight:400;font-size:.8rem">(${p.reviews} reviews)</span></span>
          </div>
          <div style="margin-left:auto"><span class="badge ${avail}">${esc(p.availability)}</span></div>
        </div>
        <div class="meta-list">
          <span class="meta-chip">📍 ${esc(p.location)}</span>
          <span class="meta-chip">⏱ ${p.experience} yrs exp</span>
          <span class="meta-chip">💵 ${money(p.price)}/hr</span>
        </div>
        <p class="desc">${esc(p.description)}</p>
        <div class="card-actions">
          <button class="btn btn-ghost btn-sm" data-action="view-provider" data-id="${p.id}">View Profile</button>
          <button class="btn btn-primary btn-sm" data-action="book" data-id="${p.id}">Book Now</button>
        </div>
      </div>`;
  }

  function serviceCard(s) {
    return `
      <div class="service-card">
        <span class="service-icon">${iconFor(s.name)}</span>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.description)}</p>
        <div class="price-row">
          <span class="price">${money(s.startingPrice)} <small>starting</small></span>
          <button class="btn btn-outline btn-sm" data-action="book-service" data-service="${esc(s.name)}">View Service</button>
        </div>
      </div>`;
  }

  function heroHtml() {
    return `
    <section class="hero">
      <div class="hero-inner">
        <span class="hero-badge">🏡 Reliable Local Services, Right at Your Doorstep</span>
        <h1>Find Trusted Local Professionals <span>Near You</span></h1>
        <p>Book reliable home services from skilled professionals in your area.</p>
        <form class="hero-search" id="heroSearch">
          <div class="search-field">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" id="heroQuery" placeholder="What service do you need?" />
          </div>
          <div class="search-field">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>
            <input type="text" id="heroLocation" placeholder="Enter your location" />
          </div>
          <button class="btn btn-primary" type="submit">Find Services</button>
        </form>
        <div class="hero-stats">
          <div class="stat"><b>${state.providers.length}+</b><span>Professionals</span></div>
          <div class="stat"><b>${state.services.length}</b><span>Services</span></div>
          <div class="stat"><b>1K+</b><span>Happy Customers</span></div>
          <div class="stat"><b>4.8★</b><span>Average Rating</span></div>
        </div>
      </div>
    </section>`;
  }

/* =========================================================
     VIEWS
     ========================================================= */
  function viewLanding(main) {
    main.innerHTML = `
      ${heroHtml()}

      <section class="section" id="services">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">Popular Services</span>
            <h2>Services Your Home Needs</h2>
            <p>Explore the most requested home services, all provided by verified local professionals.</p>
          </div>
          <div class="cards-grid">${state.services.length ? state.services.map(serviceCard).join('') : loadingBox()}</div>
          <div style="text-align:center;margin-top:34px">
            <button class="btn btn-primary" data-action="go-services">View All Services</button>
          </div>
        </div>
      </section>

      <section class="section section-alt" id="providers">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">Top Professionals</span>
            <h2>Meet Our Trusted Pros</h2>
            <p>Verified, experienced and rated by real customers in your neighborhood.</p>
          </div>
          <div class="cards-grid provider-grid">${state.providers.length ? state.providers.slice(0, 4).map(providerCard).join('') : emptyBox()}</div>
          <div style="text-align:center;margin-top:34px">
            <button class="btn btn-primary" data-action="go-providers">Browse All Providers</button>
          </div>
        </div>
      </section>

      <section class="section" id="how">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">How It Works</span>
            <h2>Book in Four Easy Steps</h2>
            <p>From search to job done — HomeFix makes it simple.</p>
          </div>
          <div class="steps-grid">
            <div class="step"><div class="step-num">01</div><h3>Search</h3><p>Find the service you need or browse professionals.</p></div>
            <div class="step"><div class="step-num">02</div><h3>Choose a Professional</h3><p>Compare ratings, reviews and prices.</p></div>
            <div class="step"><div class="step-num">03</div><h3>Book a Service</h3><p>Pick a time and confirm your booking online.</p></div>
            <div class="step"><div class="step-num">04</div><h3>Get the Job Done</h3><p>Relax while the pro handles it at your doorstep.</p></div>
          </div>
        </div>
      </section>

      ${reviewSectionHtml()}
      ${whySectionHtml()}
    `;
  }

/* =========================================================
     SECTION BUILDERS
     ========================================================= */
  function reviewSectionHtml() {
    const reviews = [
      { name: 'Emma Wilson', service: 'Home Cleaning', rating: 5, text: 'HomeFix made it effortless. The cleaner was punctual and my place looks spotless. Highly recommend!' },
      { name: 'James Carter', service: 'Plumbing', rating: 5, text: 'Found a great plumber in minutes. Fixed the leak fast and at a fair price. Fantastic experience.' },
      { name: 'Sofia Martinez', service: 'AC Repair', rating: 5, text: 'My AC broke during a heatwave. Booked at 9am, fixed by noon. Absolute lifesaver.' },
      { name: 'Michael Brown', service: 'Painting', rating: 4, text: 'Professional painters, clean finish, and they respected the timeline. Will book again.' },
      { name: 'Aisha Patel', service: 'Appliance Repair', rating: 5, text: 'Honest, quick and affordable. My washing machine is as good as new.' },
      { name: 'David Kim', service: 'Electrical', rating: 5, text: 'Safe, licensed electrician who explained everything. Great value for the money.' }
    ];
    return `
      <section class="section section-alt" id="reviews">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">Testimonials</span>
            <h2>What Our Customers Say</h2>
            <p>Real experiences from real homeowners.</p>
          </div>
          <div class="reviews-grid">
            ${reviews.map((rv) => `
              <div class="review-card">
                <div class="review-stars">${stars(rv.rating)}</div>
                <blockquote>${esc(rv.text)}</blockquote>
                <div class="review-head">
                  <span class="avatar">${esc(initials(rv.name))}</span>
                  <div><b>${esc(rv.name)}</b><span>${esc(rv.service)}</span></div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </section>`;
  }

  function whySectionHtml() {
    const features = [
      ['🛡️', 'Verified Professionals', 'Background-checked, licensed pros you can trust.'],
      ['📅', 'Easy Booking', 'Book any service in minutes, anytime.'],
      ['💰', 'Transparent Pricing', 'Clear quotes and upfront starting prices.'],
      ['📍', 'Local Services', 'Home services from professionals near you.'],
      ['😊', 'Customer Satisfaction', 'Rated and reviewed by real homeowners.']
    ];
    return `
      <section class="section" id="why">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">About HomeFix</span>
            <h2>Why Choose Us?</h2>
            <p>HomeFix connects customers with trusted local professionals for everyday home services — verified, transparent and reliable.</p>
          </div>
          <div class="feature-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px">
            ${features.map((f) => `
              <div class="feature"><span class="feature-icon">${f[0]}</span><div><b>${f[1]}</b><span>${f[2]}</span></div></div>`).join('')}
          </div>
        </div>
      </section>`;
  }

  function viewServices(main) {
    main.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">Services</span>
            <h2>Discover Our Services</h2>
            <p>Everything you need to keep your home running smoothly.</p>
          </div>
          <div class="cards-grid">${state.services.length ? state.services.map(serviceCard).join('') : emptyBox()}</div>
        </div>
      </section>`;
  }

  function emptyBox() {
    return '<div class="no-results"><span class="em">🤷</span>Nothing to display just yet.</div>';
  }
  function emptyState(title, sub) {
    return `<div class="empty-state"><span class="em">📭</span><h3>${title}</h3><p>${sub || ''}</p></div>`;
  }
  function loadingBox() {
    return `<div class="loading-box"><div class="spinner"></div><span>Loading…</span></div>`;
  }

/* =========================================================
     PROVIDERS VIEW + FILTERS
     ========================================================= */
  function providerCategories() {
    const arr = []; state.providers.forEach((p) => { if (!arr.includes(p.service)) arr.push(p.service); });
    return arr;
  }
  function providerLocations() {
    const arr = []; state.providers.forEach((p) => { if (!arr.includes(p.location)) arr.push(p.location); });
    return arr;
  }
  function filteredProviders() {
    const f = state.filters;
    const q = f.q.toLowerCase();
    return state.providers.filter((p) => {
      const mQ = !q || (p.name + ' ' + p.service + ' ' + p.location).toLowerCase().includes(q);
      const mC = f.category === 'All' || p.service === f.category;
      const mL = f.location === 'All' || p.location === f.location;
      const mR = p.rating >= Number(f.minRating);
      const mP = p.price <= Number(f.maxPrice);
      const mA = f.availability === 'All' || p.availability === f.availability;
      return mQ && mC && mL && mR && mP && mA;
    });
  }

  function viewProviders(main) {
    const cats = providerCategories();
    const locs = providerLocations();
    main.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">Professionals</span>
            <h2>Find Your Professional</h2>
            <p>Search by service, provider or location and filter to find the perfect match.</p>
          </div>
          <div class="toolbar" id="providerToolbar">
            <div class="search-field search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="text" id="fQ" placeholder="Search service, provider or location…" value="${esc(state.filters.q)}" />
            </div>
            <select id="fCategory">
              <option value="All" ${state.filters.category === 'All' ? 'selected' : ''}>All Services</option>
              ${cats.map((c) => `<option ${state.filters.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
            <select id="fLocation">
              <option value="All" ${state.filters.location === 'All' ? 'selected' : ''}>All Locations</option>
              ${locs.map((l) => `<option ${state.filters.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            </select>
            <select id="fRating">
              <option value="0" ${Number(state.filters.minRating) === 0 ? 'selected' : ''}>Any Rating</option>
              <option value="4" ${Number(state.filters.minRating) === 4 ? 'selected' : ''}>4★ &amp; up</option>
              <option value="4.5" ${Number(state.filters.minRating) === 4.5 ? 'selected' : ''}>4.5★ &amp; up</option>
            </select>
            <select id="fPrice">
              <option value="9999" ${Number(state.filters.maxPrice) === 9999 ? 'selected' : ''}>Any Price</option>
              <option value="45" ${Number(state.filters.maxPrice) === 45 ? 'selected' : ''}>Up to $45</option>
              <option value="50" ${Number(state.filters.maxPrice) === 50 ? 'selected' : ''}>Up to $50</option>
              <option value="60" ${Number(state.filters.maxPrice) === 60 ? 'selected' : ''}>Up to $60</option>
            </select>
            <select id="fAvail">
              <option value="All" ${state.filters.availability === 'All' ? 'selected' : ''}>Any Availability</option>
              <option value="Available" ${state.filters.availability === 'Available' ? 'selected' : ''}>Available</option>
              <option value="Busy" ${state.filters.availability === 'Busy' ? 'selected' : ''}>Busy</option>
            </select>
          </div>
          <div class="cards-grid provider-grid" id="providersGrid"></div>
        </div>
      </section>`;
    renderProviderGrid();
    bindProviderFilters();
  }

  function bindProviderFilters() {
    const toolbar = $('#providerToolbar');
    if (!toolbar) return;
    const apply = () => {
      const v = (id) => ($(id) ? $(id).value : '');
      state.filters.q = v('#fQ');
      state.filters.category = v('#fCategory');
      state.filters.location = v('#fLocation');
      state.filters.minRating = Number(v('#fRating') || 0);
      state.filters.maxPrice = Number(v('#fPrice') || 9999);
      state.filters.availability = v('#fAvail');
      renderProviderGrid();
    };
    toolbar.addEventListener('input', apply);
    toolbar.addEventListener('change', apply);
  }

  function renderProviderGrid() {
    const grid = $('#providersGrid');
    if (!grid) return;
    const list = filteredProviders();
    grid.innerHTML = list.length
      ? list.map(providerCard).join('')
      : '<div class="no-results"><span class="em">🔍</span><h3>No results found</h3><p>Try adjusting your search or filters.</p></div>';
  }

/* =========================================================
     PROVIDER DETAIL
     ========================================================= */
  function viewProvider(main, id) {
    const p = state.providers.find((x) => String(x.id) === String(id)) || state.providers[0];
    if (!p) { main.innerHTML = errorBox('Provider not found.'); return; }
    const avail = p.availability === 'Available' ? 'available' : 'busy';
    const revs = Array.isArray(p.customerReviews) ? p.customerReviews : [];
    main.innerHTML = `
      <div class="detail-wrap">
        <button class="back-link" data-action="go-providers">← Back to Providers</button>
        <div class="profile-hero">
          <span class="avatar">${esc(p.avatar || initials(p.name))}</span>
          <div>
            <h1>${esc(p.name)} ${p.verified ? '<span class="badge badge-verified">✓ Verified</span>' : ''}</h1>
            <span class="role-tag">${esc(p.service)} · ${esc(p.location)}</span><br/>
            <span class="rating">★ ${p.rating} (${p.reviews} reviews)</span>
            <span class="badge ${avail}" style="margin-left:8px">${esc(p.availability)}</span>
          </div>
          <div class="profile-actions">
            <button class="btn btn-primary" data-action="book" data-id="${p.id}">Book Now</button>
          </div>
        </div>

        <div class="profile-section">
          <h3>ℹ️ About</h3>
          <p style="color:var(--text-soft);margin-bottom:14px">${esc(p.description)}</p>
          <div class="detail-row"><span>Rate</span><b class="provider-price">${money(p.price)}/hr</b></div>
          <div class="detail-row"><span>Experience</span><b>${p.experience} years</b></div>
          <div class="detail-row"><span>Location</span><b>${esc(p.location)}</b></div>
          <div class="detail-row"><span>Rating</span><b>${p.rating} / 5 (${p.reviews} reviews)</b></div>
          <div class="detail-row"><span>Availability</span><b>${esc(p.availability)}</b></div>
        </div>

        <div class="profile-section">
          <h3>🛠️ Services Offered</h3>
          <div class="meta-list">
            <span class="meta-chip">${iconFor(p.service)} ${esc(p.service)}</span>
            <span class="meta-chip">💵 Starting ${money(p.price)}</span>
            <span class="meta-chip">✓ Insured</span>
            <span class="meta-chip">🕐 Flexible Hours</span>
          </div>
        </div>

        <div class="profile-section">
          <h3>⭐ Customer Reviews</h3>
          ${revs.length ? revs.map((r) => `
            <div class="rev-item">
              <span class="rating">${stars(r.rating)} ${r.rating}</span>
              <blockquote>${esc(r.comment)}</blockquote>
              <span style="color:var(--muted);font-size:.85rem">— ${esc(r.name)}</span>
            </div>`).join('') : emptyState('No reviews yet', 'Be the first to leave a rating after your booking.')}
        </div>
      </div>`;
  }

  function errorBox(msg) {
    return `<div class="error-box"><span class="em">⚠️</span>${esc(msg)}</div>`;
  }

/* =========================================================
     ABOUT VIEW
     ========================================================= */
  function viewAbout(main) {
    main.innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">About HomeFix</span>
            <h2>Trusted Local Services at Your Doorstep</h2>
            <p>HomeFix connects customers with trusted local professionals for everyday home services.</p>
          </div>
          <div class="about-grid">
            <div class="about-visual">
              <h3>Your Home, Our Priority</h3>
              <p>HomeFix brings verified plumbers, electricians, cleaners, painters and more right to your doorstep — with easy online booking and transparent pricing.</p>
            </div>
            <div class="feature-list">
              <div class="feature"><span class="feature-icon">🛡️</span><div><b>Verified Professionals</b><span>Every pro is vetted, background-checked and rated by real customers.</span></div></div>
              <div class="feature"><span class="feature-icon">📅</span><div><b>Easy Booking</b><span>Book services in minutes with instant confirmation.</span></div></div>
              <div class="feature"><span class="feature-icon">💰</span><div><b>Transparent Pricing</b><span>Clear starting prices and honest quotes, no hidden fees.</span></div></div>
              <div class="feature"><span class="feature-icon">📍</span><div><b>Local Services</b><span>Discover professionals operating in your neighborhood.</span></div></div>
              <div class="feature"><span class="feature-icon">😊</span><div><b>Customer Satisfaction</b><span>We care about great service — and it shows in our reviews.</span></div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <div class="section-head">
            <span class="section-tag">How It Works</span>
            <h2>Book in Four Easy Steps</h2>
            <p>Get the job done with HomeFix.</p>
          </div>
          <div class="steps-grid">
            <div class="step"><div class="step-num">01</div><h3>Search</h3><p>Find the service you need or browse professionals.</p></div>
            <div class="step"><div class="step-num">02</div><h3>Choose a Professional</h3><p>Compare ratings, reviews and prices.</p></div>
            <div class="step"><div class="step-num">03</div><h3>Book a Service</h3><p>Pick a time and confirm your booking online.</p></div>
            <div class="step"><div class="step-num">04</div><h3>Get the Job Done</h3><p>Relax while the pro handles it at your doorstep.</p></div>
          </div>
        </div>
      </section>

      ${reviewSectionHtml()}
    `;
  }

/* =========================================================
     DASHBOARDS
     ========================================================= */
  async function loadBookings() {
    try {
      const d = await api('/api/bookings');
      state.bookings = d.bookings || [];
    } catch (e) {
      state.bookings = [];
    }
    return state.bookings;
  }

  async function viewDashboard(main) {
    if (!state.user) { navigate('home'); openLogin(); return; }
    main.innerHTML = `<div class="dash"><div class="dash-inner">${loadingBox()}</div></div>`;
    await loadBookings();
    if (!state.user) { navigate('home'); return; }
    const role = state.user.role;
    if (role === 'ADMIN') { await adminDashboard(main); return; }
    if (role === 'PROVIDER') { await providerDashboard(main); return; }
    await customerDashboard(main);
  }

  async function customerDashboard(main) {
    const u = state.user;
    const list = state.bookings;
    const upcoming = list.filter((b) => ['Pending', 'Confirmed', 'In Progress'].includes(b.status));
    const previous = list.filter((b) => !['Pending', 'Confirmed', 'In Progress'].includes(b.status));

    main.innerHTML = `
      <div class="dash">
        <div class="dash-inner">
          <div class="dash-head">
            <div>
              <h1>👋 Welcome back, ${esc(u.fullName)}</h1>
              <p>Here's what's happening with your bookings.</p>
            </div>
            <div class="profile-summary">
              <span class="avatar">${esc(initials(u.fullName))}</span>
              <div><b>${esc(u.fullName)}</b><span>${esc(u.email)} · <span class="role-chip role-CUSTOMER">Customer</span></span></div>
            </div>
          </div>

          <div class="dash-cards">
            <div class="stat-card"><span class="stat-sym">📦</span><div><b>${list.length}</b><span>Total Bookings</span></div></div>
            <div class="stat-card"><span class="stat-sym">⏳</span><div><b>${list.filter((b) => b.status === 'Pending').length}</b><span>Pending</span></div></div>
            <div class="stat-card"><span class="stat-sym">✅</span><div><b>${list.filter((b) => b.status === 'Confirmed').length}</b><span>Confirmed</span></div></div>
            <div class="stat-card"><span class="stat-sym">✔️</span><div><b>${list.filter((b) => b.status === 'Completed').length}</b><span>Completed</span></div></div>
          </div>

          <h3 style="margin:6px 0 14px">Upcoming Bookings</h3>
          ${upcomingTable(upcoming, 'customer')}

          <h3 style="margin:30px 0 14px">Previous Bookings</h3>
          ${previousTable(previous, 'customer')}
        </div>
      </div>`;
  }

/* =========================================================
     DASHBOARD TABLE HELPERS
     ========================================================= */
  function upcomingTable(arr, viewer) {
    if (!arr.length) return emptyState('No upcoming bookings', 'New bookings will appear here.');
    return tableShell('Upcoming', arr, viewer);
  }
  function previousTable(arr, viewer) {
    if (!arr.length) return emptyState('No previous bookings', 'Past bookings will appear here.');
    return tableShell('Previous', arr, viewer);
  }
  function tableShell(title, arr, viewer) {
    const other = viewer === 'customer' ? 'Provider' : 'Customer';
    return `<div class="table-card"><div class="table-title">${title}</div>
      <table>
        <thead><tr><th>ID</th><th>Service</th><th>${other}</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${arr.map((b) => bookRowHtml(b, viewer)).join('')}</tbody>
      </table></div>`;
  }
  function bookRowHtml(b, viewer) {
    const theirs = viewer === 'customer' ? b.providerName : b.customerName;
    let actions = `<button class="btn btn-ghost btn-sm" data-action="view-booking" data-id="${b.id}">View</button>`;
    if (viewer === 'customer' && ['Pending', 'Confirmed'].includes(b.status)) {
      actions += `<button class="btn btn-danger btn-sm" data-action="cancel-booking" data-id="${b.id}">Cancel</button>`;
    } else if (viewer === 'provider') {
      if (b.status === 'Pending') {
        actions += `<button class="btn btn-primary btn-sm" data-action="update-booking" data-id="${b.id}" data-status="Confirmed">Accept</button>`;
        actions += `<button class="btn btn-danger btn-sm" data-action="update-booking" data-id="${b.id}" data-status="Rejected">Reject</button>`;
      } else if (b.status === 'Confirmed') {
        actions += `<button class="btn btn-outline btn-sm" data-action="update-booking" data-id="${b.id}" data-status="In Progress">Start</button>`;
      } else if (b.status === 'In Progress') {
        actions += `<button class="btn btn-primary btn-sm" data-action="update-booking" data-id="${b.id}" data-status="Completed">Complete</button>`;
      }
    } else if (viewer === 'admin') {
      actions += `<select class="status-select" data-action="admin-status" data-id="${b.id}" aria-label="Status">
        <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending</option>
        <option value="Confirmed" ${b.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
        <option value="In Progress" ${b.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
        <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
        <option value="Rejected" ${b.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
      </select>`;
      actions += `<button class="btn btn-danger btn-sm" data-action="delete-booking" data-id="${b.id}">Delete</button>`;
    }
    return `<tr>
      <td><b>${esc(b.bookingId)}</b></td>
      <td>${esc(b.service)}</td>
      <td>${esc(theirs)}</td>
      <td>${esc(b.date)}</td>
      <td>${esc(b.time)}</td>
      <td>${statusBadge(b.status)}</td>
      <td><div class="row-actions">${actions}</div></td>
    </tr>`;
  }

/* =========================================================
     PROVIDER DASHBOARD
     ========================================================= */
  async function providerDashboard(main) {
    const u = state.user;
    const list = state.bookings;
    const mine = state.providers.find((p) => p.name === u.fullName || String(p.id) === String(u.providerId));
    const active = list.filter((b) => ['Pending', 'Confirmed', 'In Progress'].includes(b.status));
    const done = list.filter((b) => ['Completed', 'Cancelled', 'Rejected'].includes(b.status));

    main.innerHTML = `
      <div class="dash">
        <div class="dash-inner">
          <div class="dash-head">
            <div>
              <h1>🧰 Provider Dashboard</h1>
              <p>Manage your incoming bookings and services.</p>
            </div>
            <div class="profile-summary">
              <span class="avatar">${esc(initials(mine ? mine.name : u.fullName))}</span>
              <div><b>${esc(mine ? mine.name : u.fullName)}</b><span>${esc(mine ? mine.service : 'Service Provider')} · <span class="role-chip role-PROVIDER">Provider</span></span></div>
            </div>
          </div>

          <div class="dash-cards">
            <div class="stat-card"><span class="stat-sym">📥</span><div><b>${list.length}</b><span>Total Bookings</span></div></div>
            <div class="stat-card"><span class="stat-sym">⏳</span><div><b>${list.filter((b) => b.status === 'Pending').length}</b><span>Pending</span></div></div>
            <div class="stat-card"><span class="stat-sym">✅</span><div><b>${list.filter((b) => b.status === 'Confirmed').length}</b><span>Confirmed</span></div></div>
            <div class="stat-card"><span class="stat-sym">✔️</span><div><b>${list.filter((b) => b.status === 'Completed').length}</b><span>Completed</span></div></div>
          </div>

          <div class="profile-section">
            <h3>👤 My Profile</h3>
            ${mine ? `
              <div class="detail-row"><span>Name</span><b>${esc(mine.name)}</b></div>
              <div class="detail-row"><span>Service</span><b>${esc(mine.service)}</b></div>
              <div class="detail-row"><span>Location</span><b>${esc(mine.location)}</b></div>
              <div class="detail-row"><span>Rating</span><b>★ ${mine.rating} (${mine.reviews} reviews)</b></div>
              <div class="detail-row"><span>Rate</span><b>${money(mine.price)}/hr</b></div>
              <div class="detail-row"><span>Availability</span><b>${esc(mine.availability)}</b></div>` : emptyState('No provider profile linked', 'This account is registered as a provider for demo purposes.')}
          </div>

          <h3 style="margin:6px 0 14px">Incoming Bookings</h3>
          ${upcomingTable(active, 'provider')}

          <h3 style="margin:30px 0 14px">Completed & Past</h3>
          ${done.length ? tableShell('Past Bookings', done, 'provider') : emptyState('No past bookings yet', 'Completed and cancelled bookings will appear here.')}
        </div>
      </div>`;
  }

/* =========================================================
     ADMIN DASHBOARD
     ========================================================= */
  async function adminDashboard(main) {
    const u = state.user;
    const list = state.bookings;
    main.innerHTML = `<div class="dash"><div class="dash-inner">${loadingBox()}</div></div>`;

    let stats = { totalUsers: 0, totalProviders: 0, totalServices: 0, totalBookings: 0, pendingBookings: 0, completedBookings: 0, customers: 0, providerAccounts: 0 };
    let users = []; let providers = []; let services = []; let bookings = list;
    try {
      const [st, us, pr, sv] = await Promise.all([
        api('/api/admin/stats'), api('/api/admin/users'),
        api('/api/admin/providers'), api('/api/admin/services')
      ]);
      stats = st; users = us.users || []; providers = pr.providers || []; services = sv.services || [];
      const bk = await api('/api/admin/bookings'); bookings = bk.bookings || [];
    } catch (e) { /* fallback keeps defaults */ }
    adminStore.users = users; adminStore.providers = providers; adminStore.services = services; adminStore.bookings = bookings;

    main.innerHTML = `
      <div class="dash">
        <div class="dash-inner">
          <div class="dash-head">
            <div>
              <h1>📊 Admin Dashboard</h1>
              <p>Overview and management for the HomeFix platform.</p>
            </div>
            <div class="profile-summary">
              <span class="avatar">${esc(initials(u.fullName))}</span>
              <div><b>${esc(u.fullName)}</b><span>${esc(u.email)} · <span class="role-chip role-ADMIN">Admin</span></span></div>
            </div>
          </div>

          <div class="dash-cards">
            <div class="stat-card"><span class="stat-sym">👥</span><div><b>${stats.totalUsers}</b><span>Total Users</span></div></div>
            <div class="stat-card"><span class="stat-sym">🧑‍🔧</span><div><b>${stats.totalProviders}</b><span>Total Providers</span></div></div>
            <div class="stat-card"><span class="stat-sym">🛠️</span><div><b>${stats.totalServices}</b><span>Total Services</span></div></div>
            <div class="stat-card"><span class="stat-sym">📦</span><div><b>${stats.totalBookings}</b><span>Total Bookings</span></div></div>
            <div class="stat-card"><span class="stat-sym">⏳</span><div><b>${stats.pendingBookings}</b><span>Pending Bookings</span></div></div>
            <div class="stat-card"><span class="stat-sym">✔️</span><div><b>${stats.completedBookings}</b><span>Completed Bookings</span></div></div>
          </div>

          <div class="admin-tabs">
            <button class="admin-tab action-btn" data-action="admin-tab" data-tab="users">Users</button>
            <button class="admin-tab action-btn" data-action="admin-tab" data-tab="providers">Providers</button>
            <button class="admin-tab action-btn" data-action="admin-tab" data-tab="services">Services</button>
            <button class="admin-tab action-btn" data-action="admin-tab" data-tab="bookings">Bookings</button>
          </div>
          <div id="adminPane">${adminUsersTable(users)}</div>
        </div>
      </div>`;
  }

/* =========================================================
     ADMIN TABLES & STORE
     ========================================================= */
  const adminStore = { users: [], providers: [], services: [], bookings: [] };

  function adminUsersTable(users) {
    if (!users.length) return emptyState('No users', 'Registered users will appear here.');
    return `<div class="table-card"><div class="table-title">Registered Users</div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>${users.map((u) => `
          <tr>
            <td><b>${esc(u.fullName)}</b></td>
            <td>${esc(u.email)}</td>
            <td><span class="role-chip role-${u.role}">${esc(u.role)}</span></td>
            <td>${fmtDate(u.createdAt)}</td>
            <td><button class="btn btn-danger btn-sm" data-action="admin-delete-user" data-id="${u.id}">Delete</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }
  function adminProvidersTable(providers) {
    if (!providers.length) return emptyState('No providers', 'Providers will appear here.');
    return `<div class="table-card"><div class="table-title">Service Providers</div>
      <table>
        <thead><tr><th>Name</th><th>Service</th><th>Location</th><th>Rating</th><th>Price</th><th>Actions</th></tr></thead>
        <tbody>${providers.map((p) => `
          <tr>
            <td><b>${esc(p.name)}</b></td>
            <td>${esc(p.service)}</td>
            <td>${esc(p.location)}</td>
            <td>★ ${p.rating}</td>
            <td>${money(p.price)}</td>
            <td><button class="btn btn-danger btn-sm" data-action="admin-delete-provider" data-id="${p.id}">Delete</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }
  function adminServicesTable(services) {
    if (!services.length) return emptyState('No services', 'Add a service to get started.');
    return `<div class="table-card"><div class="table-title">Services</div>
      <table>
        <thead><tr><th>Name</th><th>Description</th><th>Starting Price</th><th>Actions</th></tr></thead>
        <tbody>${services.map((s) => `
          <tr>
            <td><b>${iconFor(s.name)} ${esc(s.name)}</b></td>
            <td>${esc(s.description)}</td>
            <td>${money(s.startingPrice)}</td>
            <td><button class="btn btn-danger btn-sm" data-action="admin-delete-service" data-id="${s.id}">Delete</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }
  function adminBookingsPane(bookings) {
    if (!bookings.length) return emptyState('No bookings', 'Bookings will appear here.');
    return `<div class="table-card"><div class="table-title">All Bookings</div>
      <table>
        <thead><tr><th>ID</th><th>Customer</th><th>Provider</th><th>Service</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${bookings.map((b) => bookRowHtml(b, 'admin')).join('')}</tbody>
      </table></div>`;
  }

/* =========================================================
     BOOKINGS & PROFILE VIEWS
     ========================================================= */
  async function viewBookings(main) {
    if (!state.user) { openLogin(); return; }
    main.innerHTML = `<div class="dash"><div class="dash-inner">${loadingBox()}</div></div>`;
    await loadBookings();
    await viewDashboard(main);
  }

  async function viewProfile(main) {
    if (!state.user) { openLogin(); return; }
    const u = state.user;
    await loadBookings();
    const list = state.bookings;
    main.innerHTML = `
      <div class="dash">
        <div class="dash-inner">
          <div class="dash-head">
            <div><h1>👤 Profile</h1><p>Your account details and activity.</p></div>
            <button class="btn btn-outline" data-action="logout">Logout</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px">
            <div class="profile-section">
              <h3>👤 Account Info</h3>
              <div class="detail-row"><span>Full Name</span><b>${esc(u.fullName)}</b></div>
              <div class="detail-row"><span>Email</span><b>${esc(u.email)}</b></div>
              <div class="detail-row"><span>Role</span><b><span class="role-chip role-${u.role}">${esc(u.role)}</span></b></div>
              <div class="detail-row"><span>Member Since</span><b>${fmtDate(u.createdAt)}</b></div>
            </div>
            <div class="profile-section">
              <h3>📊 Activity Summary</h3>
              <div class="detail-row"><span>Total Bookings</span><b>${list.length}</b></div>
              <div class="detail-row"><span>Pending</span><b>${list.filter((b) => b.status === 'Pending').length}</b></div>
              <div class="detail-row"><span>Confirmed</span><b>${list.filter((b) => b.status === 'Confirmed').length}</b></div>
              <div class="detail-row"><span>Completed</span><b>${list.filter((b) => b.status === 'Completed').length}</b></div>
              <div style="margin-top:16px"><button class="btn btn-primary btn-block" data-action="dashboard">Go to Dashboard</button></div>
            </div>
          </div>
        </div>
      </div>`;
  }

/* =========================================================
     AUTH
     ========================================================= */
  function openLogin() {
    clearErrors();
    closeAllModals();
    showModal('loginModal');
    setTimeout(() => { const i = $('#loginEmail'); if (i) i.focus(); }, 60);
  }
  function openRegister() {
    clearErrors();
    closeAllModals();
    showModal('registerModal');
    setTimeout(() => { const i = $('#regName'); if (i) i.focus(); }, 60);
  }

  function setFieldError(id, msg) {
    const inp = $(id);
    if (inp) inp.classList.toggle('invalid', !!msg);
    const e = document.querySelector(`[data-error="${id.replace('#', '')}"]`);
    if (e) e.textContent = msg || '';
  }

  async function doRegister(e) {
    e.preventDefault();
    clearErrors();
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    const role = $('#regRole').value;
    let ok = true;
    if (!name) { setFieldError('regName', 'Full name is required.'); ok = false; }
    if (!/^[A-Za-z][\w.%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) { setFieldError('regEmail', 'Enter a valid email.'); ok = false; }
    if (!password || password.length < 6) { setFieldError('regPassword', 'Password must be at least 6 characters.'); ok = false; }
    if (!ok) return;
    const btn = $('#registerSubmit'); btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const d = await api('/api/auth/register', { method: 'POST', body: { fullName: name, email, password, role } });
      state.user = d.user;
      closeModal('registerModal');
      renderNav();
      toast('Registration successful', `Welcome to HomeFix, ${d.user.fullName}!`, 'success');
      navigate('dashboard');
    } catch (err) {
      toast('Registration failed', err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    clearErrors();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    if (!email) return setFieldError('loginEmail', 'Email is required.');
    if (!password) return setFieldError('loginPassword', 'Password is required.');
    const btn = $('#loginSubmit'); btn.disabled = true; btn.textContent = 'Logging in…';
    try {
      const d = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      state.user = d.user;
      closeModal('loginModal');
      renderNav();
      toast('Login successful', `Welcome back, ${d.user.fullName}!`, 'success');
      navigate('dashboard');
    } catch (err) {
      toast('Login failed', err.message, 'error');
      setFieldError('loginPassword', err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Log In';
    }
  }

  function setFieldError(id, msg) { setAuthError(id, msg); }
  function setAuthError(id, msg) {
    const inp = $(id);
    if (inp) inp.classList.toggle('invalid', !!msg);
    const e = document.querySelector(`[data-error="${id.replace('#', '')}"]`);
    if (e) e.textContent = msg || '';
  }

  async function handleLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); }
    catch (err) { /* still clear locally */ }
    state.user = null;
    closeAllModals();
    renderNav();
    toast('Logged out', 'You have been logged out successfully.', 'info');
    navigate('home');
  }

/* =========================================================
     BOOKING MODAL
     ========================================================= */
  const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];

  function openBooking(providerId, presetService) {
    if (!state.user) { toast('Login required', 'Please log in to book a service.', 'info'); openLogin(); return; }
    if (state.user.role !== 'CUSTOMER' && state.user.role !== 'ADMIN') {
      toast('Customers only', 'Only customer accounts can create bookings.', 'info');
      return;
    }
    const serviceSel = $('#bService');
    const provSel = $('#bProvider');
    const provs = state.providers;

    serviceSel.innerHTML = '<option value="">Select a service</option>' +
      state.services.map((s) => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('');

    function populateProviders(service) {
      const filtered = service ? provs.filter((p) => p.service === service) : provs;
      provSel.innerHTML = '<option value="">Select a provider</option>' +
        filtered.map((p) => `<option value="${p.id}">${esc(p.name)} (${money(p.price)}/hr)</option>`).join('');
    }

    serviceSel.onchange = () => { populateProviders(serviceSel.value); updateBookingBar(); };
    provSel.onchange = updateBookingBar;

    if (presetService) { serviceSel.value = presetService; }
    if (providerId) {
      const presetProvider = provs.find((p) => String(p.id) === String(providerId));
      if (presetProvider) {
        serviceSel.value = presetProvider.service;
        populateProviders(presetProvider.service);
        provSel.value = String(presetProvider.id);
      }
    } else {
      populateProviders(serviceSel.value);
    }
    updateBookingBar();

    const today = new Date().toISOString().split('T')[0];
    const pickDate = $('#bDate');
    pickDate.min = today;
    if (!pickDate.value || pickDate.value < today) pickDate.value = today;
    $('#bTime').innerHTML = TIME_SLOTS.map((t) => `<option>${t}</option>`).join('');
    $('#bAddress').value = state.user.address || '';
    $('#bNotes').value = '';
    clearErrors();
    closeAllModals();
    showModal('bookingModal');
  }

  function updateBookingBar() {
    const elm = $('#bookingProviderBar');
    if (!elm) return;
    const id = $('#bProvider') ? $('#bProvider').value : '';
    const p = state.providers.find((x) => String(x.id) === String(id));
    elm.innerHTML = p ? `
      <div class="booking-bar">
        <span class="avatar">${esc(p.avatar || initials(p.name))}</span>
        <div><b>Booking with ${esc(p.name)}</b><span>${esc(p.service)} · ${money(p.price)}/hr · ★ ${p.rating}</span></div>
      </div>` : '';
  }

  async function handleBookingSubmit(e) {
    e.preventDefault();
    const service = $('#bService').value;
    const providerId = $('#bProvider').value;
    const date = $('#bDate').value;
    const time = $('#bTime').value;
    const address = $('#bAddress').value.trim();
    const notes = $('#bNotes').value.trim();
    let ok = true;
    setFieldError('bService', '');
    setFieldError('bDate', '');
    setFieldError('bAddress', '');
    if (!service) ok = false;
    if (!providerId) { setFieldError('bService', 'Please select a provider.'); ok = false; }
    if (!date) { setFieldError('bDate', 'Please pick a date.'); ok = false; }
    if (!address) { setFieldError('bAddress', 'Address is required.'); ok = false; }
    if (!ok) { toast('Missing details', 'Please complete the required booking fields.', 'error'); return; }

    const btn = $('#bookingSubmit'); btn.disabled = true; btn.textContent = 'Booking…';
    try {
      const d = await api('/api/bookings', { method: 'POST', body: { providerId: Number(providerId), service, date, time, address, notes } });
      closeModal('bookingModal');
      toast('Booking created', `Your booking ${d.booking.bookingId} is pending confirmation.`, 'success');
      fillConfirm(d.booking);
      showModal('confirmModal');
    } catch (err) {
      toast('Booking failed', err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Confirm Booking';
    }
  }

  function fillConfirm(b) {
    $('#confirmDetails').innerHTML = `
      <div class="detail-row"><span>Booking ID</span><b>${esc(b.bookingId)}</b></div>
      <div class="detail-row"><span>Service</span><b>${esc(b.service)}</b></div>
      <div class="detail-row"><span>Provider</span><b>${esc(b.providerName)}</b></div>
      <div class="detail-row"><span>Date</span><b>${esc(b.date)}</b></div>
      <div class="detail-row"><span>Time</span><b>${esc(b.time)}</b></div>
      <div class="detail-row"><span>Address</span><b>${esc(b.address)}</b></div>
      <div class="detail-row"><span>Status</span><b>${statusBadge(b.status)}</b></div>`;
  }

  function openBookingDetails(id) {
    const b = state.bookings.find((x) => String(x.id) === String(id));
    if (!b) return;
    $('#viewBookingContent').innerHTML = `
      <div class="detail-row"><span>Booking ID</span><b>${esc(b.bookingId)}</b></div>
      <div class="detail-row"><span>Service</span><b>${esc(b.service)}</b></div>
      <div class="detail-row"><span>Provider</span><b>${esc(b.providerName)}</b></div>
      <div class="detail-row"><span>Customer</span><b>${esc(b.customerName)}</b></div>
      <div class="detail-row"><span>Date</span><b>${esc(b.date)}</b></div>
      <div class="detail-row"><span>Time</span><b>${esc(b.time)}</b></div>
      <div class="detail-row"><span>Address</span><b>${esc(b.address)}</b></div>
      <div class="detail-row"><span>Status</span><b>${statusBadge(b.status)}</b></div>
      ${b.notes ? `<div class="detail-row"><span>Notes</span><b>${esc(b.notes)}</b></div>` : ''}`;
    closeAllModals();
    showModal('viewBookingModal');
  }

/* =========================================================
     BOOKING ACTIONS
     ========================================================= */
  async function cancelBooking(id) {
    const b = state.bookings.find((x) => String(x.id) === String(id));
    const bid = b ? b.bookingId : ('#' + id);
    if (!confirm('Cancel booking ' + bid + '?')) return;
    try {
      await api(`/api/bookings/${id}`, { method: 'PUT', body: { action: 'cancel' } });
      toast('Booking cancelled', `Booking ${bid} has been cancelled.`, 'info');
      routeRefresh();
    } catch (err) { toast('Cancel failed', err.message, 'error'); }
  }

  async function updateBookingStatus(id, status) {
    try {
      const d = await api(`/api/bookings/${id}`, { method: 'PUT', body: { status } });
      toast('Booking updated', d.message, 'success');
      routeRefresh();
    } catch (err) { toast('Update failed', err.message, 'error'); }
  }

  async function deleteBooking(id) {
    if (!confirm('Delete this booking permanently?')) return;
    try {
      await api(`/api/bookings/${id}`, { method: 'DELETE' });
      toast('Booking deleted', 'The booking has been removed.', 'info');
      routeRefresh();
    } catch (err) { toast('Delete failed', err.message, 'error'); }
  }

  async function adminDelete(endpoint, id) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api(`/api/admin/${endpoint}/${id}`, { method: 'DELETE' });
      toast('Deleted', 'Item removed successfully.', 'info');
      routeRefresh();
    } catch (err) { toast('Delete failed', err.message, 'error'); }
  }

  function routeRefresh() {
    const r = parseRoute().name;
    navigate((r === 'home' || r === 'landing') ? 'dashboard' : r);
  }

  function refresh() { routeRefresh(); }

/* =========================================================
     EVENTS & INIT
     ========================================================= */
  function adminTab(tab) {
    const pane = $('#adminPane');
    if (!pane) return;
    if (tab === 'users') pane.innerHTML = adminUsersTable(adminStore.users);
    else if (tab === 'providers') pane.innerHTML = adminProvidersTable(adminStore.providers);
    else if (tab === 'services') pane.innerHTML = adminServicesTable(adminStore.services);
    else if (tab === 'bookings') pane.innerHTML = adminBookingsPane(adminStore.bookings);
  }

  function handleAction(action, el) {
    const id = el.getAttribute('data-id');
    switch (action) {
      case 'login': openLogin(); break;
      case 'register': openRegister(); break;
      case 'logout': handleLogout(); break;
      case 'theme': toggleTheme(); break;
      case 'menu': { const m = $('#mobileMenu'); if (m) m.classList.toggle('open'); break; }
      case 'dashboard': navigate('dashboard'); break;
      case 'profile': navigate('profile'); break;
      case 'bookings': navigate('bookings'); break;
      case 'about': navigate('about'); break;
      case 'go-home': navigate('home'); break;
      case 'go-services': navigate('services'); break;
      case 'go-providers': navigate('providers'); break;
      case 'go-back': navigate('providers'); break;
      case 'view-provider': navigate('provider/' + id); break;
      case 'book': openBooking(id); break;
      case 'book-service': {
        const svc = el.getAttribute('data-service');
        state.filters.category = svc;
        navigate('providers'); break;
      }
      case 'view-booking': openBookingDetails(id); break;
      case 'cancel-booking': cancelBooking(id); break;
      case 'update-booking': updateBookingStatus(id, el.getAttribute('data-status')); break;
      case 'delete-booking': deleteBooking(id); break;
      case 'admin-delete-user': adminDelete('users', id); break;
      case 'admin-delete-provider': adminDelete('providers', id); break;
      case 'admin-delete-service': adminDelete('services', id); break;
      case 'admin-tab': adminTab(el.getAttribute('data-tab')); break;
    }
  }

  function bindEvents() {
    // Global click delegation for data-action elements
    document.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-nav]');
      if (navEl) { e.preventDefault(); navigate(navEl.getAttribute('data-nav')); return; }
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.getAttribute('data-action');
      handleAction(action, target);
    });

    // Document-level change delegation (admin status selects)
    document.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-action="admin-status"]');
      if (!sel) return;
      updateBookingStatus(sel.getAttribute('data-id'), sel.value);
    });

    // Hero search form
    document.addEventListener('submit', (e) => {
      if (e.target && e.target.id === 'heroSearch') {
        e.preventDefault();
        const q = $('#heroQuery').value.trim();
        const loc = $('#heroLocation').value.trim();
        state.filters.q = q;
        if (loc) state.filters.location = loc;
        else state.filters.location = 'All';
        navigate('providers');
      }
    });

    // Static modal forms (guard against missing elements; never break init)
    const bindForm = (id, handler) => {
      const form = $(id);
      if (form) form.addEventListener('submit', handler);
    };
    bindForm('#loginForm', handleLoginSubmit);
    bindForm('#registerForm', doRegister);
    bindForm('#bookingForm', handleBookingSubmit);

    // Modal close buttons and backdrop clicks
    document.querySelectorAll('[data-close]').forEach((b) => {
      b.addEventListener('click', () => closeModal(b.getAttribute('data-close')));
    });
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal(backdrop.id);
      });
    });

    // Escape key closes modals & mobile menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeAllModals(); const m = $('#mobileMenu'); if (m) m.classList.remove('open'); }
    });

    window.addEventListener('hashchange', render);
  }

  async function init() {
    // Theme
    applyTheme(localStorage.getItem('homefix-theme') || 'light');
    $('#year').textContent = new Date().getFullYear();

    try {
      const [sv, pr] = await Promise.all([api('/api/services'), api('/api/providers')]);
      state.services = sv.services || [];
      state.providers = pr.providers || [];
    } catch (err) {
      toast('Network error', 'Could not load services. Refresh to try again.', 'error');
    }

    // Restore session
    try {
      const me = await api('/api/auth/me');
      state.user = me.user;
    } catch (err) { state.user = null; }

    // ALWAYS render the UI even if event binding fails, so the page is never blank.
    try { bindEvents(); }
    catch (err) { console.error('bindEvents failed:', err); }
    try { renderNav(); render(); }
    finally { revealApp(); } // swap boot skeleton for real content & reveal footer
  }

  /* Reveal the static footer once the first render completes (ends the boot state). */
  function revealApp() {
    try {
      const f = document.querySelector('.footer');
      if (f) f.hidden = false;
    } catch (err) { /* never block init */ }
  }

  document.addEventListener('DOMContentLoaded', init);
})();