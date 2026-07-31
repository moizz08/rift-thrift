// ─── State ─────────────────────────────────────────────────────────────────────
const API_URL = '/api'; // relative — works on Replit, Vercel, everywhere
let products = [];
let appLayers = [];
let currentBaseCategory = 'Featured';
let currentFilterOption = 'Featured';
let currentSubCategory = 'All';
let pendingPriceFilter = 'all';
let currentPriceFilter = 'all';
let currentPage = 1;
let filteredData = [];
const perPage = 8;
let cartItems = [];
let wishlist = JSON.parse(localStorage.getItem('rift_wishlist') || '[]');
let cardImageIndex = {};
let selectedSize = 'M';
let appliedCoupon = null;
let currentCheckoutSubtotal = 0;
let directBuyItem = null;
let toastTimeout;
let quickAddProductId = null;
let quickAddSelectedSize = null;
let quickAddEvent = null;
let savedHomeScroll = 0;
let activeProductImages = [];
let currentLightboxIndex = 0;
let allAdminOrders = [];

// ─── App Layer / History ──────────────────────────────────────────────────────
function pushAppLayer(id, closeFunc) {
    appLayers.push({ id, closeFunc });
    history.pushState({ layerId: id }, '', '#' + id);
}
function replaceTopAppLayer(id, closeFunc) {
    if (appLayers.length > 0) {
        appLayers[appLayers.length - 1] = { id, closeFunc };
        history.replaceState({ layerId: id }, '', '#' + id);
    } else {
        pushAppLayer(id, closeFunc);
    }
}
function goBack() { history.back(); }
function clearAllLayers() {
    while (appLayers.length > 0) {
        const layer = appLayers.pop();
        layer.closeFunc(true);
    }
}

window.addEventListener('popstate', (e) => {
    const state = e.state;
    if (appLayers.length > 0) {
        const layer = appLayers.pop();
        layer.closeFunc(true);
        return;
    }
    if (state && state.view === 'home') {
        currentBaseCategory = state.cat || 'Featured';
        currentPage = state.page || 1;
        const query = state.search || '';
        document.getElementById('desktopSearchInput').value = query;
        document.getElementById('mobileSearchInput').value = query;
        hideAllSections();
        document.getElementById('homeSection').style.display = 'block';
        updateActiveMenu();
        applyFilters(false);
    } else {
        resetHomeLogic(true);
    }
});

function hideAllSections() {
    ['infoSection','detailSection','checkoutSection','successSection','adminSection','myOrdersSection','wishlistSection'].forEach(id => {
        document.getElementById(id).classList.add('hidden-section');
    });
}

function updateMainState(push = true) {
    const query = document.getElementById('desktopSearchInput').value || document.getElementById('mobileSearchInput').value;
    const stateObj = { view: 'home', cat: currentBaseCategory, page: currentPage, search: query };
    if (push) history.pushState(stateObj, '', '');
    else history.replaceState(stateObj, '', '');
}

// ─── Scroll to Top ────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollTopBtn');
    if (window.scrollY > 400) btn.classList.add('show');
    else btn.classList.remove('show');
});

// ─── Products: Load from API ──────────────────────────────────────────────────
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) throw new Error('Failed');
        products = await res.json();
        document.getElementById('productSkeleton').style.display = 'none';
        document.getElementById('productGrid').classList.remove('hidden');
        filteredData = [...products];
        applyFilters(false);
    } catch (e) {
        document.getElementById('productSkeleton').innerHTML = '<div class="col-span-2 md:col-span-4 text-center py-16"><i class="fa-solid fa-wifi-slash text-4xl text-gray-300 mb-4"></i><p class="text-gray-500 font-bold tracking-widest uppercase text-xs">Connection error. Please refresh.</p><button onclick="location.reload()" class="mt-4 bg-black text-white px-6 py-2 text-xs font-bold tracking-widest uppercase cursor-pointer hover:bg-gray-800 transition">RETRY</button></div>';
    }
}

// ─── Render Products ──────────────────────────────────────────────────────────
function render() {
    cardImageIndex = {};
    const grid = document.getElementById('productGrid');
    const totalPages = Math.ceil(filteredData.length / perPage);
    const start = (currentPage - 1) * perPage;
    const displayItems = filteredData.slice(start, start + perPage);

    grid.classList.remove('grid-animate');
    void grid.offsetWidth;
    grid.classList.add('grid-animate');

    if (displayItems.length === 0) {
        grid.innerHTML = `<div class="col-span-2 md:col-span-4 text-center py-20">
            <i class="fa-solid fa-box-open text-5xl text-gray-200 mb-4"></i>
            <p class="text-gray-400 font-bold tracking-widest uppercase text-xs">No products found.</p>
            <button onclick="clearFiltersFromPage()" class="mt-4 border border-black px-6 py-2 text-xs font-bold tracking-widest uppercase cursor-pointer hover:bg-black hover:text-white transition">CLEAR FILTERS</button>
        </div>`;
    } else {
        grid.innerHTML = displayItems.map(p => {
            const isWished = wishlist.includes(p.id);
            const displayPrice = p.sale_price ? `<span class="line-through text-gray-400 text-[11px] mr-1">Rs. ${p.price}</span><span class="text-red-500 font-bold text-[14px] md:text-[15px]">Rs. ${p.sale_price}</span>` : `<span class="text-[13px] md:text-[15px] font-bold text-black">Rs. ${p.price}</span>`;
            const badges = [
                p.is_flash_sale ? `<span class="sale-badge">SALE</span>` : '',
                p.is_new ? `<span class="new-badge">NEW</span>` : '',
                p.is_best_seller ? `<span class="bestseller-badge">★ BEST</span>` : '',
            ].filter(Boolean).join('');
            return `
            <div class="product-card group relative flex flex-col h-full">
                <div class="aspect-[3/4] bg-gray-100 mb-2 md:mb-3 relative overflow-hidden border cursor-pointer flex-shrink-0"
                    onclick="handleCardClick(event, ${p.id})"
                    ontouchstart="cardTouchStart(event, ${p.id})"
                    ontouchend="cardTouchEnd(event, ${p.id})">
                    ${badges ? `<div class="product-badges">${badges}</div>` : ''}
                    <button onclick="event.stopPropagation(); toggleWishlist(${p.id}, event)" class="wish-btn absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center bg-white/80 rounded-full shadow hover:scale-110 transition ${isWished ? 'active text-red-500' : 'text-gray-400'}">
                        <i class="fa-${isWished ? 'solid' : 'regular'} fa-heart text-sm"></i>
                    </button>
                    <div class="absolute inset-0 skeleton-loader z-0"></div>
                    <img id="card-img-${p.id}" src="${p.images[0] || ''}" class="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-0 z-10 relative" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';" onerror="this.style.display='none'">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-500 z-10"></div>
                    <div id="card-dots-${p.id}" class="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 opacity-0 transition-opacity duration-300">
                        ${p.images.map((_, i) => `<div class="card-dot-${p.id} w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'} transition-all"></div>`).join('')}
                    </div>
                    <div class="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-400 z-20">
                        <button onclick="event.stopPropagation(); showDetail(${p.id})" class="bg-white text-black px-3 py-2 font-bold tracking-widest text-[10px] hover:bg-black hover:text-white active:scale-90 transition shadow-lg rounded-sm">VIEW</button>
                        <button onclick="event.stopPropagation(); showQuickAdd(${p.id}, event);" class="bg-white text-black px-3 py-2 font-bold tracking-widest text-[10px] hover:bg-black hover:text-white active:scale-90 transition shadow-lg rounded-sm"><i class="fa-solid fa-cart-plus"></i></button>
                    </div>
                </div>
                <div class="text-center px-1 cursor-pointer flex-1 flex flex-col justify-between" onclick="showDetail(${p.id})">
                    <div>
                        <p class="text-[9px] md:text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-0.5">${p.sale_type || (p.gender + ' / ' + p.category)}</p>
                        <h3 class="text-[12px] md:text-sm font-bold uppercase mb-1 truncate leading-tight">${p.name}</h3>
                        <div class="mb-1">${displayPrice}</div>
                    </div>
                    <button onclick="event.stopPropagation(); showQuickAdd(${p.id}, event);" class="md:hidden w-full bg-black text-white text-[10px] py-2.5 mt-2 font-bold tracking-[0.2em] uppercase hover:bg-gray-800 active:scale-95 transition-all shadow-sm rounded-sm cursor-pointer flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-bag-shopping text-[9px]"></i> ADD TO CART
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.innerText = `PAGE ${currentPage} / ${totalPages || 1}`;
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages || totalPages === 0);
    const pagination = document.getElementById('pagination');
    if (pagination) {
        if (totalPages <= 1) pagination.classList.add('hidden');
        else { pagination.classList.remove('hidden'); pagination.classList.add('flex'); }
    }
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function applyFilters(pushHistory = false) {
    const deskInput = document.getElementById('desktopSearchInput').value.toLowerCase();
    const mobInput = document.getElementById('mobileSearchInput').value.toLowerCase();
    const query = deskInput || mobInput;

    filteredData = products.filter(p => {
        if (query) {
            return p.name.toLowerCase().includes(query) ||
                   p.category.toLowerCase().includes(query) ||
                   (p.sale_type && p.sale_type.toLowerCase().includes(query)) ||
                   p.gender.toLowerCase().includes(query);
        } else {
            if (currentBaseCategory !== 'Featured' && p.gender !== currentBaseCategory) return false;
            if (currentFilterOption === 'Best Seller' && !p.is_best_seller) return false;
            if (currentFilterOption === 'New Arrivals' && !p.is_new) return false;
            if (currentFilterOption === 'Flash Sale' && !p.is_flash_sale) return false;
            if (currentFilterOption === 'Shop by Category' && currentSubCategory !== 'All') {
                if (currentSubCategory === 'Skinny Jeans' && p.category !== 'Skinny') return false;
                else if (currentSubCategory !== 'Skinny Jeans' && p.category !== currentSubCategory) return false;
            }
        }
        // Price filter
        const effectivePrice = p.sale_price || p.price;
        if (currentPriceFilter === 'under1000' && effectivePrice >= 1000) return false;
        if (currentPriceFilter === '1000to1500' && (effectivePrice < 1000 || effectivePrice > 1500)) return false;
        if (currentPriceFilter === 'above1500' && effectivePrice <= 1500) return false;
        return true;
    });

    const catDisplay = document.getElementById('catDisplay');
    if (catDisplay) catDisplay.innerText = query ? 'SEARCH RESULTS' : currentBaseCategory.toUpperCase();

    render();
    toggleHeaderBackBtn(currentBaseCategory !== 'Featured' || currentPage > 1 || query !== '');
    updateClearFilterBar();
    updateHeroBanner();
    if (pushHistory) updateMainState(true);
}

let pendingFilterOption = 'Featured';
let pendingSubCategory = 'All';

function updateFilterDrawerUI() {
    document.querySelectorAll('input[name="filterOpt"]').forEach(r => r.checked = (r.value === pendingFilterOption));
    document.querySelectorAll('input[name="subCatOpt"]').forEach(r => r.checked = (r.value === pendingSubCategory));
    document.querySelectorAll('input[name="priceOpt"]').forEach(r => r.checked = (r.value === pendingPriceFilter));
    document.getElementById('subCategorySection').classList.toggle('hidden', pendingFilterOption !== 'Shop by Category');
}

function setFilterOpt(val) { pendingFilterOption = val; if (val !== 'Shop by Category') pendingSubCategory = 'All'; updateFilterDrawerUI(); }
function setSubCat(val) { pendingSubCategory = val; updateFilterDrawerUI(); }
function setPriceFilter(val) { pendingPriceFilter = val; updateFilterDrawerUI(); }

function applyFilterBtn() {
    currentFilterOption = pendingFilterOption;
    currentSubCategory = pendingSubCategory;
    currentPriceFilter = pendingPriceFilter;
    currentPage = 1;
    applyFilters(false);
    updateMainState(false);
    goBack();
}

function resetFiltersBtn() {
    pendingFilterOption = 'Featured'; pendingSubCategory = 'All'; pendingPriceFilter = 'all';
    updateFilterDrawerUI();
}

function clearFiltersFromPage() {
    pendingFilterOption = 'Featured'; pendingSubCategory = 'All'; pendingPriceFilter = 'all';
    currentFilterOption = 'Featured'; currentSubCategory = 'All'; currentPriceFilter = 'all';
    currentPage = 1;
    applyFilters(false);
    updateMainState(false);
}

function updateClearFilterBar() {
    const btn = document.getElementById('clearFilterBtn');
    if (!btn) return;
    const hasFilter = currentFilterOption !== 'Featured' || currentPriceFilter !== 'all';
    if (hasFilter) { btn.classList.remove('hidden'); btn.classList.add('flex'); }
    else { btn.classList.add('hidden'); btn.classList.remove('flex'); }
}

let searchTimeout;
function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage = 1;
        applyFilters(false);
        updateMainState(false);
    }, 280);
}

function clearSearch(type) {
    if (type === 'desktop') document.getElementById('desktopSearchInput').value = '';
    else document.getElementById('mobileSearchInput').value = '';
    currentPage = 1;
    applyFilters(false);
    updateMainState(false);
}

function updateHeroBanner() {
    const banner = document.getElementById('heroBanner');
    if (!banner) return;
    const hasSearch = document.getElementById('desktopSearchInput').value || document.getElementById('mobileSearchInput').value;
    banner.style.display = (currentBaseCategory === 'Featured' && !hasSearch) ? '' : 'none';
}

function toggleHeaderBackBtn(show) {
    const btn = document.getElementById('sectionBackBtn');
    if (!btn) return;
    if (show) { btn.classList.remove('hidden'); btn.classList.add('flex'); }
    else { btn.classList.add('hidden'); btn.classList.remove('flex'); }
}

function navigateTo(category) {
    currentBaseCategory = category;
    currentFilterOption = 'Featured';
    currentSubCategory = 'All';
    currentPriceFilter = 'all';
    currentPage = 1;
    updateActiveMenu();
    clearAllLayers();
    applyFilters(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changePage(step) {
    currentPage += step;
    applyFilters(true);
    window.scrollTo({ top: 0 });
}

function resetHomeLogic(isPop = false) {
    currentBaseCategory = 'Featured'; currentFilterOption = 'Featured';
    currentSubCategory = 'All'; currentPriceFilter = 'all'; currentPage = 1;
    updateActiveMenu();
    document.getElementById('desktopSearchInput').value = '';
    document.getElementById('mobileSearchInput').value = '';
    document.getElementById('desktopSearchClose').classList.add('hidden');
    clearAllLayers();
    hideAllSections();
    document.getElementById('homeSection').style.display = 'block';
    document.getElementById('heroBanner').style.display = '';
    applyFilters(false);
    if (!isPop) updateMainState(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateActiveMenu() {
    document.querySelectorAll('.menu-item-cat').forEach(el => {
        const isActive = el.dataset.cat === currentBaseCategory;
        el.classList.toggle('border-black', isActive);
        el.classList.toggle('bg-gray-50', isActive);
        el.classList.toggle('text-black', isActive);
        el.classList.toggle('border-transparent', !isActive);
        el.classList.toggle('text-gray-500', !isActive);
    });
}

function toggleFilter() {
    const drawer = document.getElementById('filterDrawer');
    const overlay = document.getElementById('filterOverlay');
    if (drawer.classList.contains('translate-x-full')) {
        pendingFilterOption = currentFilterOption;
        pendingSubCategory = currentSubCategory;
        pendingPriceFilter = currentPriceFilter;
        updateFilterDrawerUI();
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        pushAppLayer('filter', () => { drawer.classList.add('translate-x-full'); overlay.classList.add('hidden'); });
    } else {
        goBack();
    }
}

// ─── Search UI ─────────────────────────────────────────────────────────────────
function showDesktopSearchClose() { document.getElementById('desktopSearchClose').classList.remove('hidden'); }
function closeDesktopSearch() {
    document.getElementById('desktopSearchInput').value = '';
    document.getElementById('desktopSearchClose').classList.add('hidden');
    clearSearch('desktop');
}
function toggleMobileSearch() {
    const ms = document.getElementById('mobileSearch');
    if (ms.classList.contains('hidden')) {
        ms.classList.remove('hidden'); ms.classList.add('flex');
        document.getElementById('mobileSearchInput').focus();
    } else {
        ms.classList.add('hidden'); ms.classList.remove('flex');
        if (document.getElementById('mobileSearchInput').value) clearSearch('mobile');
    }
}

// ─── Sidebar Auth ─────────────────────────────────────────────────────────────
function openAuthFromSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('-translate-x-full');
    const user = JSON.parse(localStorage.getItem('user'));
    // Replace menu layer with auth layer (or user dropdown) in place
    if (appLayers.length > 0 && appLayers[appLayers.length - 1].id === 'menu') {
        if (user) {
            appLayers.pop();
            history.replaceState({}, '', location.pathname);
            setTimeout(() => toggleUserDropdown(), 50);
            return;
        }
        const auth = document.getElementById('authModal');
        auth.classList.remove('hidden-section');
        switchAuth('login');
        appLayers[appLayers.length - 1] = { id: 'auth', closeFunc: () => auth.classList.add('hidden-section') };
        history.replaceState({ layerId: 'auth' }, '', '#auth');
    } else {
        if (user) { toggleUserDropdown(); return; }
        openAuthModal('login');
    }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function toggleMenu() {
    const el = document.getElementById('sidebar');
    if (el.classList.contains('-translate-x-full')) {
        el.classList.remove('-translate-x-full');
        pushAppLayer('menu', () => el.classList.add('-translate-x-full'));
    } else {
        goBack();
    }
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, icon = 'fa-check', color = '') {
    const toast = document.getElementById('toast');
    clearTimeout(toastTimeout);
    const colorClass = color === 'red' ? 'bg-red-600' : color === 'green' ? 'bg-green-600' : '';
    toast.innerHTML = `<i class="fa-solid ${icon} mr-2"></i> ${message}`;
    toast.className = colorClass ? `${colorClass} text-white text-center rounded-md px-5 py-3.5 fixed z-[9999] left-1/2 bottom-0 font-bold tracking-widest text-xs uppercase shadow-xl` : '';
    toast.classList.add('show');
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); toast.className = ''; }, 2200);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function closeAuthModal() {
    const auth = document.getElementById('authModal');
    if (!auth.classList.contains('hidden-section')) {
        auth.classList.add('hidden-section');
        goBack();
    }
}

// Navbar user icon — show signup first (with "already have an account" link below)
function toggleAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) { toggleUserDropdown(); return; }
    openAuthModal('signup');
}

// Used by sidebar button and any other place that needs a specific tab
function openAuthModal(type = 'signup') {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) { toggleUserDropdown(); return; }
    const auth = document.getElementById('authModal');
    if (auth.classList.contains('hidden-section')) {
        auth.classList.remove('hidden-section');
        switchAuth(type);
        pushAppLayer('auth', () => auth.classList.add('hidden-section'));
    } else {
        switchAuth(type);
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    const isOpen = !dropdown.classList.contains('hidden');
    if (isOpen) { dropdown.classList.add('hidden'); }
    else {
        dropdown.classList.remove('hidden');
        setTimeout(() => document.addEventListener('click', closeDropdownOutside, { once: true }), 0);
    }
}

function closeDropdownOutside(e) {
    const btn = document.getElementById('userHeaderBtn');
    if (!btn.contains(e.target)) document.getElementById('userDropdown').classList.add('hidden');
}

function showAuthSection(section) {
    ['loginSection','signupSection','alreadyLoggedInSection','loginSuccessSection','signupSuccessSection'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(section + 'Section').classList.remove('hidden');
}

function switchAuth(type) { showAuthSection(type === 'signup' ? 'signup' : 'login'); }

async function handleLoginSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.textContent = 'SIGNING IN...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            syncUserUI();
            document.getElementById('loginSuccessMsg').innerText = 'WELCOME BACK, ' + data.user.name.split(' ')[0].toUpperCase() + '!';
            showAuthSection('loginSuccess');
        } else {
            alert(data.error || 'Authentication failed');
        }
    } catch { alert('Server unreachable. Please try again.'); }
    finally { btn.textContent = 'LOGIN'; btn.disabled = false; }
}

async function handleSignupSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('signupBtn');
    btn.textContent = 'CREATING...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('signupName').value,
                username: document.getElementById('signupUsername').value,
                email: document.getElementById('signupEmail').value,
                phone: document.getElementById('signupPhone').value,
                password: document.getElementById('signupPassword').value
            })
        });
        const data = await res.json();
        if (res.ok) {
            const name = document.getElementById('signupName').value;
            document.getElementById('signupSuccessMsg').innerText = 'WELCOME, ' + name.split(' ')[0].toUpperCase() + '!';
            showAuthSection('signupSuccess');
            document.getElementById('signupForm').reset();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch { alert('Server connection error.'); }
    finally { btn.textContent = 'SIGN UP'; btn.disabled = false; }
}

function syncUserUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    const sidebarBtn = document.getElementById('sidebarAuthBtn');
    const sidebarUserInfo = document.getElementById('sidebarUserInfo');
    if (user) {
        document.getElementById('userHeaderName').innerText = user.name.split(' ')[0].toUpperCase();
        document.getElementById('userDropdown').classList.add('hidden');
        document.getElementById('dropdownName').innerText = user.name.toUpperCase();
        document.getElementById('dropdownUsername').innerText = '@' + (user.username || '');
        document.getElementById('dropdownEmail').innerText = user.email;
        document.getElementById('adminMenuLink').classList.toggle('hidden', user.role !== 'admin');
        if (document.getElementById('adminNameDisplay')) document.getElementById('adminNameDisplay').innerText = user.name.split(' ')[0].toUpperCase();
        if (sidebarBtn) sidebarBtn.textContent = 'VIEW ACCOUNT';
        if (sidebarUserInfo) {
            sidebarUserInfo.classList.remove('hidden');
            document.getElementById('sidebarUserName').innerText = user.name.toUpperCase();
            document.getElementById('sidebarUserEmail').innerText = user.email;
        }
    } else {
        document.getElementById('userHeaderName').innerText = '';
        document.getElementById('adminMenuLink').classList.add('hidden');
        document.getElementById('userDropdown').classList.add('hidden');
        if (sidebarBtn) sidebarBtn.textContent = 'SIGN IN / CREATE ACCOUNT';
        if (sidebarUserInfo) sidebarUserInfo.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    syncUserUI();
    resetHomeLogic(false);
    showToast('Signed out successfully', 'fa-arrow-right-from-bracket');
}

// ─── Info Pages ────────────────────────────────────────────────────────────────
function showPage(page) {
    const isMenuOpen = !document.getElementById('sidebar').classList.contains('-translate-x-full');
    document.getElementById('homeSection').style.display = 'none';
    document.getElementById('infoSection').classList.remove('hidden-section');
    document.getElementById('heroBanner').style.display = 'none';
    toggleHeaderBackBtn(false);
    const title = document.getElementById('infoTitle');
    const content = document.getElementById('infoContent');
    if (page === 'policy') {
        title.innerText = 'RETURN / EXCHANGE POLICY';
        content.innerHTML = `<p class="text-gray-600 leading-relaxed">Items can be returned or exchanged within <strong>14 days</strong> of receiving your order. Please ensure the items are unworn, unwashed, and have the original tags attached.</p><p class="text-gray-600 leading-relaxed mt-4">Sale items are final and non-refundable. To initiate a return, contact us via WhatsApp at <strong>+92 300 1234567</strong> with your order ID and reason.</p>`;
    } else if (page === 'about') {
        title.innerText = 'ABOUT US';
        content.innerHTML = `<p class="text-gray-600 leading-relaxed">Welcome to <strong>RIFT THRIFT CLOTHING</strong> — Karachi's home for curated, affordable fashion. We believe in quality without compromise and style without the markup.</p><p class="text-gray-600 leading-relaxed mt-4">Founded in 2024, we specialize in premium denim, cloud baggy jeans, and streetwear. Every piece is handpicked for quality and fit.</p>`;
    } else if (page === 'contact') {
        title.innerText = 'CONTACT US';
        content.innerHTML = `<div class="space-y-4"><div class="flex items-center gap-3"><i class="fa-brands fa-instagram text-lg"></i><div><p class="font-bold text-xs tracking-widest">INSTAGRAM</p><a href="https://www.instagram.com/rift_pk" target="_blank" class="text-blue-600 text-sm">@rift_pk</a></div></div><div class="flex items-center gap-3"><i class="fa-brands fa-whatsapp text-lg text-green-600"></i><div><p class="font-bold text-xs tracking-widest">WHATSAPP / PHONE</p><a href="https://wa.me/923001234567" target="_blank" class="text-blue-600 text-sm">+92 300 1234567</a></div></div><div class="flex items-center gap-3"><i class="fa-solid fa-envelope text-lg"></i><div><p class="font-bold text-xs tracking-widest">EMAIL</p><p class="text-sm">support@riftthrift.pk</p></div></div><div class="flex items-center gap-3"><i class="fa-solid fa-location-dot text-lg"></i><div><p class="font-bold text-xs tracking-widest">ADDRESS</p><p class="text-sm">Karachi, Pakistan</p></div></div></div>`;
    }
    window.scrollTo({ top: 0 });
    const closeInfo = () => {
        document.getElementById('infoSection').classList.add('hidden-section');
        document.getElementById('homeSection').style.display = 'block';
        document.getElementById('heroBanner').style.display = '';
    };
    if (isMenuOpen) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        replaceTopAppLayer('info', closeInfo);
    } else {
        pushAppLayer('info', closeInfo);
    }
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
function toggleCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer.classList.contains('translate-x-full')) {
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        pushAppLayer('cart', () => { drawer.classList.add('translate-x-full'); overlay.classList.add('hidden'); });
    } else {
        goBack();
    }
}

function updateCartUI() {
    const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-badge').forEach(el => el.innerText = totalItemsCount);
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.innerText = totalItemsCount > 0 ? `(${totalItemsCount})` : '';
    const list = document.getElementById('cartItemsList');
    if (!list) return;
    localStorage.setItem('rift_cart', JSON.stringify(cartItems));

    if (cartItems.length === 0) {
        list.innerHTML = `<div class="flex flex-col items-center justify-center mt-16">
            <i class="fa-solid fa-cart-arrow-down text-5xl text-gray-200 mb-4"></i>
            <p class="text-gray-400 text-sm mb-6 font-medium">Your cart is empty</p>
            <button onclick="goBack()" class="bg-black text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-gray-800 transition cursor-pointer shadow rounded-sm">Continue Shopping</button>
        </div>`;
        const sub = document.getElementById('cartSubtotal'); if (sub) sub.innerText = 'Rs. 0';
        const tot = document.getElementById('cartTotal'); if (tot) tot.innerText = 'Rs. 250';
        return;
    }

    let total = 0;
    list.innerHTML = cartItems.map((item, index) => {
        const rowTotal = (item.sale_price || item.price) * item.quantity;
        total += rowTotal;
        return `<div class="flex gap-3 border-b pb-4">
            <div class="w-16 h-20 bg-gray-100 border flex-shrink-0 overflow-hidden rounded-sm">
                <img src="${item.images[0]}" class="w-full h-full object-cover" onerror="this.style.opacity='0.3'">
            </div>
            <div class="flex-1 flex flex-col justify-between py-0.5">
                <div>
                    <h4 class="text-[11px] font-bold uppercase truncate">${item.name}</h4>
                    <p class="text-[10px] text-gray-400 mt-0.5 uppercase">Size: <strong>${item.cartSize}</strong> &nbsp;|&nbsp; ${item.color}</p>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 px-2 py-1 rounded-sm">
                        <button onclick="updateQuantity(${index},-1)" class="text-gray-500 hover:text-black transition cursor-pointer text-xs active:scale-90">${item.quantity === 1 ? '<i class="fa-solid fa-trash-can text-red-400"></i>' : '<i class="fa-solid fa-minus"></i>'}</button>
                        <span class="text-sm font-bold w-4 text-center">${item.quantity}</span>
                        <button onclick="updateQuantity(${index},1)" class="text-gray-500 hover:text-black transition cursor-pointer text-xs active:scale-90"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <span class="font-bold text-sm">Rs. ${rowTotal.toLocaleString()}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    const shipping = total >= 2000 ? 0 : 250;
    const sub = document.getElementById('cartSubtotal'); if (sub) sub.innerText = `Rs. ${total.toLocaleString()}`;
    const tot = document.getElementById('cartTotal'); if (tot) tot.innerText = `Rs. ${(total + shipping).toLocaleString()}`;
    const shipEl = document.getElementById('cartShipping'); if (shipEl) shipEl.innerText = shipping === 0 ? 'FREE 🎉' : 'Rs. 250';
    const prog = document.getElementById('shippingProgress');
    if (prog) {
        prog.classList.remove('hidden');
        prog.textContent = total >= 2000 ? '✓ Free shipping unlocked!' : `Add Rs. ${(2000 - total).toLocaleString()} more for free shipping`;
        prog.className = total >= 2000 ? 'text-[10px] font-bold text-green-600 text-center py-1' : 'text-[10px] text-gray-400 text-center py-1';
    }
}

function addCart(id, event, sizeOverride) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const cartSize = sizeOverride || selectedSize;
    const existing = cartItems.findIndex(item => item.id === id && item.cartSize === cartSize);
    if (existing > -1) { cartItems[existing].quantity += 1; }
    else { cartItems.push({ ...p, cartSize, quantity: 1 }); }
    updateCartUI();
    flyToCart(event, p.images[0]);
    playCartSound();
    showToast('Added to Cart', 'fa-bag-shopping');
}

function flyToCart(event, imgUrl) {
    const cartIcons = document.querySelectorAll('.cart-icon-btn');
    if (!cartIcons.length) return;
    let cartEl = null;
    cartIcons.forEach(el => { if (el.offsetParent !== null) cartEl = el; });
    if (!cartEl) cartEl = cartIcons[0];
    const cartRect = cartEl.getBoundingClientRect();

    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 3;
    if (event) {
        const t = event.changedTouches?.[0] || event.touches?.[0];
        if (t) { startX = t.clientX; startY = t.clientY; }
        else if (event.clientX !== undefined) { startX = event.clientX; startY = event.clientY; }
        else { // fallback: use the element's position
            const rect = (event.target || event.currentTarget)?.getBoundingClientRect?.();
            if (rect) { startX = rect.left + rect.width / 2; startY = rect.top + rect.height / 2; }
        }
    }

    const flyEl = imgUrl ? document.createElement('img') : document.createElement('div');
    if (imgUrl) {
        flyEl.src = imgUrl;
        flyEl.style.cssText = `position:fixed;width:44px;height:56px;object-fit:cover;border-radius:6px;border:2px solid #fff;
            left:${startX}px;top:${startY}px;transform:translate(-50%,-50%) scale(1);
            z-index:99999;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.4);
            transition:left 0.58s cubic-bezier(0.25,0.8,0.4,1),top 0.58s cubic-bezier(0.25,0.8,0.4,1),transform 0.58s ease,opacity 0.58s ease;`;
    } else {
        flyEl.style.cssText = `position:fixed;width:14px;height:14px;background:#000;border-radius:50%;
            left:${startX}px;top:${startY}px;transform:translate(-50%,-50%) scale(1);
            z-index:99999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.4);
            transition:left 0.52s cubic-bezier(0.25,0.8,0.4,1),top 0.52s cubic-bezier(0.25,0.8,0.4,1),transform 0.52s ease,opacity 0.52s ease;`;
    }
    document.body.appendChild(flyEl);
    void flyEl.offsetWidth;
    flyEl.style.left = `${cartRect.left + cartRect.width / 2}px`;
    flyEl.style.top = `${cartRect.top + cartRect.height / 2}px`;
    flyEl.style.transform = 'translate(-50%,-50%) scale(0.1)';
    flyEl.style.opacity = '0';
    const dur = imgUrl ? 580 : 520;
    setTimeout(() => {
        flyEl.remove();
        cartIcons.forEach(btn => {
            btn.classList.remove('cart-shake'); void btn.offsetWidth; btn.classList.add('cart-shake');
            setTimeout(() => btn.classList.remove('cart-shake'), 700);
        });
    }, dur);
}

function flyToWishlist(event, imgUrl) {
    const wishBtn = document.getElementById('wishNavBtn');
    if (!wishBtn) return;
    const wishRect = wishBtn.getBoundingClientRect();

    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 3;
    if (event) {
        const t = event.changedTouches?.[0] || event.touches?.[0];
        if (t) { startX = t.clientX; startY = t.clientY; }
        else if (event.clientX !== undefined) { startX = event.clientX; startY = event.clientY; }
        else {
            const rect = (event.target || event.currentTarget)?.getBoundingClientRect?.();
            if (rect) { startX = rect.left + rect.width / 2; startY = rect.top + rect.height / 2; }
        }
    }

    const flyEl = imgUrl ? document.createElement('img') : document.createElement('div');
    if (imgUrl) {
        flyEl.src = imgUrl;
        flyEl.style.cssText = `position:fixed;width:38px;height:48px;object-fit:cover;border-radius:6px;border:2px solid #fff;
            left:${startX}px;top:${startY}px;transform:translate(-50%,-50%) scale(1);
            z-index:99999;pointer-events:none;box-shadow:0 4px 16px rgba(239,68,68,0.4);
            transition:left 0.58s cubic-bezier(0.25,0.8,0.4,1),top 0.58s cubic-bezier(0.25,0.8,0.4,1),transform 0.58s ease,opacity 0.58s ease;`;
    } else {
        flyEl.style.cssText = `position:fixed;width:12px;height:12px;background:#ef4444;border-radius:50%;
            left:${startX}px;top:${startY}px;transform:translate(-50%,-50%) scale(1);
            z-index:99999;pointer-events:none;
            transition:left 0.52s cubic-bezier(0.25,0.8,0.4,1),top 0.52s cubic-bezier(0.25,0.8,0.4,1),transform 0.52s ease,opacity 0.52s ease;`;
    }
    document.body.appendChild(flyEl);
    void flyEl.offsetWidth;
    flyEl.style.left = `${wishRect.left + wishRect.width / 2}px`;
    flyEl.style.top = `${wishRect.top + wishRect.height / 2}px`;
    flyEl.style.transform = 'translate(-50%,-50%) scale(0.1)';
    flyEl.style.opacity = '0';
    setTimeout(() => {
        flyEl.remove();
        wishBtn.classList.remove('wish-nav-bounce'); void wishBtn.offsetWidth; wishBtn.classList.add('wish-nav-bounce');
        setTimeout(() => wishBtn.classList.remove('wish-nav-bounce'), 600);
    }, 580);
}

// ─── Sound Effects ─────────────────────────────────────────────────────────────
function playCartSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [[800, 0], [1050, 0.13]].forEach(([freq, delay]) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = freq;
            o.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.22, ctx.currentTime + delay);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
            o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.22);
        });
    } catch(e) {}
}

function playWishlistSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [[620, 0], [930, 0.16]].forEach(([freq, delay]) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = freq;
            o.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.18, ctx.currentTime + delay);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
            o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.28);
        });
    } catch(e) {}
}

// ─── Quick Add Popup ───────────────────────────────────────────────────────────
function showQuickAdd(id, event) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    quickAddProductId = id;
    quickAddSelectedSize = null;
    quickAddEvent = event;

    document.getElementById('qaName').textContent = p.name;
    document.getElementById('qaImg').src = p.images[0] || '';
    document.getElementById('qaCategory').textContent = (p.sale_type || (p.gender + ' / ' + p.category)).toUpperCase();
    document.getElementById('qaColorDot').style.background = p.color_hex || '#000';
    document.getElementById('qaColorName').textContent = p.color;

    const priceEl = document.getElementById('qaPrice');
    priceEl.innerHTML = p.sale_price
        ? `<span class="line-through text-gray-400 text-base mr-1.5 font-normal">Rs. ${p.price}</span><span class="text-red-500">Rs. ${p.sale_price}</span>`
        : `Rs. ${p.price}`;

    const unavail = Array.isArray(p.unavailable_sizes) ? p.unavailable_sizes : [];
    const sizes = Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL'];
    document.getElementById('qaSizes').innerHTML = sizes.map(s => {
        const isUn = unavail.includes(s);
        return `<button onclick="selectQASize('${s}')" id="qa-size-${s}"
            class="qa-size-btn px-4 py-2.5 text-[11px] font-bold uppercase rounded-sm cursor-pointer"
            ${isUn ? 'disabled' : ''}>${s}</button>`;
    }).join('');

    const firstAvail = sizes.find(s => !unavail.includes(s));
    if (firstAvail) selectQASize(firstAvail);

    const overlay = document.getElementById('quickAddOverlay');
    const modal = document.getElementById('quickAddModal');
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    overlay.classList.add('open');
    modal.classList.add('open');
    pushAppLayer('quickAdd', () => {
        overlay.classList.remove('open'); modal.classList.remove('open');
        setTimeout(() => { overlay.classList.add('hidden'); modal.classList.add('hidden'); }, 360);
        quickAddProductId = null; quickAddSelectedSize = null;
    });
}

function selectQASize(size) {
    quickAddSelectedSize = size;
    document.querySelectorAll('.qa-size-btn').forEach(btn => btn.classList.remove('qa-selected'));
    const btn = document.getElementById(`qa-size-${size}`);
    if (btn && !btn.disabled) btn.classList.add('qa-selected');
}

function closeQuickAdd() { if (quickAddProductId !== null) goBack(); }

function confirmQuickAdd(e) {
    if (!quickAddProductId) return;
    if (!quickAddSelectedSize) { showToast('Please select a size', 'fa-triangle-exclamation'); return; }
    const id = quickAddProductId, size = quickAddSelectedSize;
    addCart(id, e, size);
    closeQuickAdd();
}

function updateQuantity(index, change) {
    if (cartItems[index].quantity === 1 && change === -1) cartItems.splice(index, 1);
    else cartItems[index].quantity += change;
    updateCartUI();
}

// ─── Wishlist ──────────────────────────────────────────────────────────────────
function toggleWishlist(id, evt) {
    const idx = wishlist.indexOf(id);
    const adding = idx === -1;
    if (adding) {
        wishlist.push(id);
        showToast('Added to Wishlist ♥', 'fa-heart');
        const p = products.find(x => x.id === id);
        if (p) flyToWishlist(evt, p.images[0]);
        playWishlistSound();
    } else {
        wishlist.splice(idx, 1);
        showToast('Removed from Wishlist', 'fa-heart-crack', 'red');
    }
    localStorage.setItem('rift_wishlist', JSON.stringify(wishlist));
    updateWishBadge();
    // Update every heart button for this product + animate
    document.querySelectorAll(`[onclick*="toggleWishlist(${id})"]`).forEach(btn => {
        const isNowWished = wishlist.includes(id);
        btn.classList.toggle('active', isNowWished);
        btn.classList.toggle('text-red-500', isNowWished);
        btn.classList.toggle('text-gray-400', !isNowWished);
        btn.innerHTML = `<i class="fa-${isNowWished ? 'solid' : 'regular'} fa-heart text-sm"></i>`;
        // Animate
        btn.classList.remove('heart-pop');
        void btn.offsetWidth;
        btn.classList.add('heart-pop');
        setTimeout(() => btn.classList.remove('heart-pop'), 450);
    });
}

function updateWishBadge() {
    const badge = document.getElementById('wishBadge');
    if (!badge) return;
    if (wishlist.length > 0) {
        badge.textContent = wishlist.length;
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }
}

function showWishlistPage() {
    const section = document.getElementById('wishlistSection');
    section.classList.remove('hidden-section');
    const close = () => section.classList.add('hidden-section');
    const isMenuOpen = !document.getElementById('sidebar').classList.contains('-translate-x-full');
    if (isMenuOpen) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        replaceTopAppLayer('wishlist', close);
    } else {
        pushAppLayer('wishlist', close);
    }
    renderWishlist();
}

function hideWishlist() { goBack(); }

function renderWishlist() {
    const wishItems = products.filter(p => wishlist.includes(p.id));
    const emptyEl = document.getElementById('wishlistEmpty');
    const gridEl = document.getElementById('wishlistGrid');
    if (!wishItems.length) {
        emptyEl.classList.remove('hidden');
        gridEl.classList.add('hidden');
        return;
    }
    emptyEl.classList.add('hidden');
    gridEl.classList.remove('hidden');
    gridEl.innerHTML = wishItems.map(p => `
        <div class="bg-white border rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition">
            <div class="aspect-[3/4] bg-gray-100 relative overflow-hidden" onclick="showDetail(${p.id}); hideWishlist();">
                <img src="${p.images[0]}" class="w-full h-full object-cover">
            </div>
            <div class="p-3">
                <p class="text-[10px] text-gray-400 tracking-widest uppercase">${p.gender} / ${p.category}</p>
                <h4 class="text-xs font-bold uppercase truncate mt-0.5">${p.name}</h4>
                <p class="text-sm font-bold mt-1">Rs. ${p.sale_price || p.price}</p>
                <div class="flex gap-2 mt-2">
                    <button onclick="addCart(${p.id})" class="flex-1 bg-black text-white py-2 text-[10px] font-bold tracking-widest uppercase cursor-pointer hover:bg-gray-800 transition rounded-sm">ADD TO CART</button>
                    <button onclick="toggleWishlist(${p.id}); renderWishlist();" class="border border-red-300 text-red-500 px-3 py-2 text-[10px] cursor-pointer hover:bg-red-50 transition rounded-sm"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        </div>`).join('');
}

// ─── Product Detail ────────────────────────────────────────────────────────────
function showDetail(id) {
    savedHomeScroll = window.scrollY;
    selectedSize = 'M';
    const p = products.find(x => x.id === id);
    if (!p) return;
    activeProductImages = p.images;
    const unavailableSizes = Array.isArray(p.unavailable_sizes) ? p.unavailable_sizes : [];
    const content = document.getElementById('detailContent');
    document.getElementById('detailSection').classList.remove('hidden-section');
    window.scrollTo({ top: 0 });
    pushAppLayer('detail', () => {
        document.getElementById('detailSection').classList.add('hidden-section');
        setTimeout(() => window.scrollTo({ top: savedHomeScroll, behavior: 'instant' }), 0);
    });

    const displayPrice = p.sale_price
        ? `<p class="mb-1"><span class="line-through text-gray-400 text-base mr-2">Rs. ${p.price}</span><span class="text-red-500 font-bold text-2xl md:text-3xl">Rs. ${p.sale_price}</span></p>
           <span class="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">SAVE Rs. ${p.price - p.sale_price}</span>`
        : `<p class="text-xl md:text-2xl font-bold text-black mb-3">Rs. ${p.price}</p>`;

    const isWished = wishlist.includes(p.id);
    const sizeButtons = ['S', 'M', 'L', 'XL'].map(s => {
        const isUnavail = unavailableSizes.includes(s);
        const isSelected = s === 'M';
        return `<button onclick="${isUnavail ? '' : `selectSizeBtn(this,'${s}')`}" class="size-btn border border-gray-300 bg-white text-black w-11 h-11 md:w-12 md:h-12 text-xs md:text-sm font-bold ${isSelected && !isUnavail ? 'selected border-black bg-black text-white' : ''} ${isUnavail ? 'unavailable' : ''}" ${isUnavail ? 'disabled title="Out of Stock"' : ''}>${s}${isUnavail ? '' : ''}</button>`;
    }).join('');

    content.innerHTML = `
        <div class="space-y-2 md:space-y-3 w-full">
            <div class="aspect-[3/4] bg-gray-100 flex items-center justify-center relative overflow-hidden cursor-pointer rounded border border-gray-200 group no-click-effect"
                ontouchstart="detailTouchStart(event)" ontouchend="detailTouchEnd(event)" onclick="detailClick(event)">
                <div id="detail-img-counter" class="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-bold tracking-widest z-20 backdrop-blur-sm">1/${activeProductImages.length}</div>
                <div class="absolute inset-0 skeleton-loader rounded z-0"></div>
                <img id="mainDetailImg" data-index="0" src="${activeProductImages[0]}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 opacity-0 z-10 relative" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';">
                <div class="absolute bottom-3 right-3 bg-white/80 w-8 h-8 flex justify-center items-center rounded-full shadow-lg hover:bg-white hover:scale-110 transition z-20"><i class="fa-solid fa-expand text-sm"></i></div>
                ${p.is_flash_sale ? '<div class="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-bold px-2 py-1 z-20 uppercase tracking-widest">SALE</div>' : (p.is_new ? '<div class="absolute top-3 left-3 bg-black text-white text-[9px] font-bold px-2 py-1 z-20 uppercase tracking-widest">NEW</div>' : '')}
            </div>
            <div class="flex gap-2 justify-start">
                ${activeProductImages.map((img, i) => `<div class="w-14 md:w-20 aspect-[3/4] bg-gray-100 border border-gray-200 cursor-pointer hover:border-black transition relative overflow-hidden rounded-sm" onclick="setMainImg(${i})">
                    <div class="absolute inset-0 skeleton-loader z-0"></div>
                    <img src="${img}" class="w-full h-full object-cover opacity-0 z-10 relative transition-opacity duration-300" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';">
                </div>`).join('')}
            </div>
        </div>
        <div class="flex flex-col justify-center py-2 md:py-0 px-1 md:px-0">
            <div class="flex items-center justify-between mb-2">
                <p class="text-[10px] font-bold text-gray-400 tracking-widest uppercase">${p.sale_type || (p.gender + ' / ' + p.category)}</p>
                <button onclick="toggleWishlist(${p.id})" class="wish-btn flex items-center gap-1.5 text-xs font-bold ${isWished ? 'text-red-500 active' : 'text-gray-400'} hover:text-red-500 transition cursor-pointer">
                    <i class="fa-${isWished ? 'solid' : 'regular'} fa-heart text-lg"></i>
                    <span class="hidden md:inline">${isWished ? 'Wishlisted' : 'Wishlist'}</span>
                </button>
            </div>
            <h2 class="logo-font text-2xl md:text-3xl font-bold mb-2 uppercase tracking-wide leading-tight text-gray-900">${p.name}</h2>
            <div class="mb-3">${displayPrice}</div>
            <p class="text-sm text-gray-500 font-medium mb-4 leading-relaxed">${p.description}</p>

            <div class="space-y-4 mb-5 border-t border-b py-4 border-gray-200">
                <div>
                    <div class="flex items-center justify-between mb-2.5">
                        <p class="text-[10px] font-bold text-gray-400 tracking-widest uppercase">SELECT SIZE</p>
                        <button onclick="setMainImg(2)" class="text-[10px] font-bold text-gray-500 hover:text-black transition cursor-pointer tracking-widest underline">SIZE GUIDE</button>
                    </div>
                    <div class="flex gap-2">${sizeButtons}</div>
                    ${unavailableSizes.length > 0 ? `<p class="text-[10px] text-gray-400 mt-2"><i class="fa-solid fa-info-circle mr-1"></i>Strikethrough sizes are currently out of stock</p>` : ''}
                </div>
                <div class="flex items-center gap-2">
                    <p class="text-[10px] font-bold text-gray-400 tracking-widest uppercase">COLOR:</p>
                    <span class="text-xs font-bold text-black">${p.color}</span>
                    <span class="w-4 h-4 rounded-full border border-gray-300 shadow-sm inline-block" style="background-color:${p.color_hex}"></span>
                </div>
            </div>

            <div class="flex flex-col gap-2.5">
                <button onclick="addCart(${p.id}, event)" class="cursor-pointer w-full border border-black bg-white text-black py-3.5 md:py-4 font-bold text-[11px] md:text-xs tracking-widest uppercase hover:bg-gray-100 active:scale-95 transition-all duration-200 rounded-sm">ADD TO CART</button>
                <button onclick="buyNow(${p.id})" class="cursor-pointer w-full bg-black text-white py-3.5 md:py-4 font-bold text-[11px] md:text-xs tracking-widest uppercase hover:bg-gray-800 active:scale-95 transition-all duration-200 rounded-sm shadow-md">BUY NOW →</button>
            </div>
            ${p.is_best_seller ? '<p class="text-center text-[10px] text-gray-400 mt-3 tracking-widest"><i class="fa-solid fa-star text-yellow-500 mr-1"></i>BEST SELLER — Loved by our customers</p>' : ''}
        </div>
    `;
}

function hideDetail() { goBack(); }

function selectSizeBtn(btn, size) {
    btn.closest('.flex').querySelectorAll('.size-btn:not(.unavailable)').forEach(b => {
        b.classList.remove('selected', 'border-black', 'bg-black', 'text-white');
        b.classList.add('border-gray-300', 'bg-white', 'text-black');
    });
    btn.classList.add('selected', 'border-black', 'bg-black', 'text-white');
    btn.classList.remove('border-gray-300', 'bg-white', 'text-black');
    selectedSize = size;
}

// ─── Image Swipe ──────────────────────────────────────────────────────────────
let cardTouchStartX = 0, cardTouchStartY = 0, cardWasSwiped = false;
function cardTouchStart(e, id) {
    cardTouchStartX = e.changedTouches[0].screenX;
    cardTouchStartY = e.changedTouches[0].screenY;
    cardWasSwiped = false;
    const dots = document.getElementById('card-dots-' + id);
    if (dots) dots.style.opacity = '1';
}
function cardTouchEnd(e, id) {
    const endX = e.changedTouches[0].screenX;
    const endY = e.changedTouches[0].screenY;
    const diffX = cardTouchStartX - endX;
    const diffY = cardTouchStartY - endY;
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
        cardWasSwiped = true;
        const p = products.find(x => x.id === id);
        if (!p) return;
        const imgCount = p.images.length;
        if (!cardImageIndex[id]) cardImageIndex[id] = 0;
        cardImageIndex[id] = diffX > 0 ? (cardImageIndex[id] + 1) % imgCount : (cardImageIndex[id] - 1 + imgCount) % imgCount;
        swipeCardImage(id, p.images[cardImageIndex[id]], diffX > 0 ? 1 : -1);
    } else {
        setTimeout(() => { const d = document.getElementById('card-dots-' + id); if (d) d.style.opacity = '0'; }, 2000);
    }
}
function handleCardClick(e, id) { if (cardWasSwiped) { cardWasSwiped = false; return; } showDetail(id); }
function swipeCardImage(id, newSrc, direction) {
    const img = document.getElementById('card-img-' + id);
    if (!img) return;
    img.style.transition = 'transform 0.2s, opacity 0.2s';
    img.style.opacity = '0'; img.style.transform = direction > 0 ? 'translateX(-20%)' : 'translateX(20%)';
    setTimeout(() => {
        img.src = newSrc; img.style.transition = 'none';
        img.style.transform = direction > 0 ? 'translateX(20%)' : 'translateX(-20%)';
        void img.offsetWidth;
        img.style.transition = 'transform 0.2s, opacity 0.2s';
        img.style.opacity = '1'; img.style.transform = 'translateX(0)';
    }, 200);
    const currentIdx = cardImageIndex[id] || 0;
    document.querySelectorAll('.card-dot-' + id).forEach((dot, i) => {
        dot.className = dot.className.replace(/bg-white\/\d+|bg-white(?!\/)/g, '');
        dot.classList.add(i === currentIdx ? 'bg-white' : 'bg-white/50');
    });
    const dots = document.getElementById('card-dots-' + id);
    if (dots) { dots.style.opacity = '1'; clearTimeout(dots._hideTimer); dots._hideTimer = setTimeout(() => { dots.style.opacity = '0'; }, 2500); }
}

// ─── Detail Image ─────────────────────────────────────────────────────────────
let detailTouchStartX = 0, detailTouchStartY = 0, isDetailSwiped = false;
function detailTouchStart(e) { detailTouchStartX = e.changedTouches[0].screenX; detailTouchStartY = e.changedTouches[0].screenY; isDetailSwiped = false; }
function detailTouchEnd(e) {
    const diffX = detailTouchStartX - e.changedTouches[0].screenX;
    const diffY = detailTouchStartY - e.changedTouches[0].screenY;
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        isDetailSwiped = true;
        changeDetailImg(diffX > 0 ? 1 : -1);
    }
}
function detailClick(e) { if (!isDetailSwiped) openLightboxFromDetail(); isDetailSwiped = false; }
function changeDetailImg(step) {
    const mainImg = document.getElementById('mainDetailImg');
    if (!mainImg) return;
    let idx = parseInt(mainImg.getAttribute('data-index')) + step;
    if (idx < 0) idx = activeProductImages.length - 1;
    if (idx >= activeProductImages.length) idx = 0;
    setMainImg(idx, step);
}
function setMainImg(index, direction = 0) {
    const mainImg = document.getElementById('mainDetailImg');
    if (!mainImg) return;
    if (direction !== 0) {
        mainImg.style.transition = 'transform 0.25s, opacity 0.25s';
        mainImg.style.opacity = '0'; mainImg.style.transform = direction > 0 ? 'translateX(-30px)' : 'translateX(30px)';
        setTimeout(() => {
            mainImg.src = activeProductImages[index]; mainImg.setAttribute('data-index', index);
            mainImg.style.transition = 'none'; mainImg.style.transform = direction > 0 ? 'translateX(30px)' : 'translateX(-30px)';
            void mainImg.offsetWidth;
            mainImg.style.transition = 'transform 0.25s, opacity 0.25s';
            mainImg.style.opacity = '1'; mainImg.style.transform = 'translateX(0)';
        }, 250);
    } else {
        mainImg.style.transition = 'opacity 0.2s';
        mainImg.style.opacity = '0';
        setTimeout(() => { mainImg.src = activeProductImages[index]; mainImg.setAttribute('data-index', index); mainImg.style.opacity = '1'; }, 200);
    }
    const counter = document.getElementById('detail-img-counter');
    if (counter) counter.innerText = `${index + 1}/${activeProductImages.length}`;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function openLightboxFromDetail() {
    const index = parseInt(document.getElementById('mainDetailImg').getAttribute('data-index'));
    openLightbox(index);
}
function openLightbox(index) {
    currentLightboxIndex = index;
    document.getElementById('lightbox').classList.remove('hidden-section');
    updateLightboxImg();
    pushAppLayer('lightbox', () => document.getElementById('lightbox').classList.add('hidden-section'));
}
function closeLightbox() { goBack(); }
function changeLightboxImg(step) {
    currentLightboxIndex = (currentLightboxIndex + step + activeProductImages.length) % activeProductImages.length;
    updateLightboxImg(step);
}
function updateLightboxImg(direction = 0) {
    const img = document.getElementById('lightbox-img');
    const loader = document.getElementById('lightbox-loader');
    loader.style.display = 'flex';
    if (direction !== 0) {
        img.style.transition = 'transform 0.25s, opacity 0.25s';
        img.style.opacity = '0'; img.style.transform = direction > 0 ? 'translateX(-50px)' : 'translateX(50px)';
        setTimeout(() => {
            img.src = activeProductImages[currentLightboxIndex];
            img.style.transition = 'none'; img.style.transform = direction > 0 ? 'translateX(50px)' : 'translateX(-50px)';
            void img.offsetWidth;
            img.style.transition = 'transform 0.25s, opacity 0.25s';
            img.style.opacity = '1'; img.style.transform = 'translateX(0)';
        }, 250);
    } else {
        img.style.opacity = '0';
        setTimeout(() => { img.src = activeProductImages[currentLightboxIndex]; img.style.opacity = '1'; }, 200);
    }
    const counter = document.getElementById('lightbox-counter');
    if (counter) counter.innerText = `${currentLightboxIndex + 1}/${activeProductImages.length}`;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────
function buyNow(id) {
    const p = products.find(x => x.id === id);
    directBuyItem = { ...p, cartSize: selectedSize, quantity: 1 };
    proceedToCheckout(true);
}

function proceedToCheckout(isDirect = false) {
    appliedCoupon = null;
    const couponInput = document.getElementById('couponInput');
    const couponMsg = document.getElementById('couponMsg');
    const discountRow = document.getElementById('discountRow');
    if (couponInput) couponInput.value = '';
    if (couponMsg) { couponMsg.classList.add('hidden'); couponMsg.textContent = ''; }
    if (discountRow) discountRow.classList.add('hidden');

    let itemsToProcess = isDirect ? [directBuyItem] : cartItems;
    if (!isDirect && cartItems.length === 0) { alert('Your cart is empty!'); return; }

    const isCartOpen = !document.getElementById('cartDrawer').classList.contains('translate-x-full');
    let subtotal = 0;

    document.getElementById('checkoutSummaryItems').innerHTML = itemsToProcess.map(item => {
        const unitPrice = item.sale_price || item.price;
        const rowTotal = unitPrice * item.quantity;
        subtotal += rowTotal;
        return `<div class="flex gap-3 items-center">
            <div class="w-12 h-14 bg-gray-200 overflow-hidden flex-shrink-0 border"><img src="${item.images[0]}" class="w-full h-full object-cover" onerror="this.style.opacity='0.3'"></div>
            <div class="flex-1 flex justify-between items-center">
                <div><p class="font-bold text-xs uppercase truncate">${item.name} <span class="text-red-500 font-normal">×${item.quantity}</span></p><p class="text-[10px] text-gray-400 mt-0.5 uppercase">Size: ${item.cartSize} | ${item.color}</p></div>
                <span class="font-bold text-sm flex-shrink-0">Rs. ${rowTotal.toLocaleString()}</span>
            </div>
        </div>`;
    }).join('');

    currentCheckoutSubtotal = subtotal;
    const chkShip = subtotal >= 2000 ? 0 : 250;
    document.getElementById('chkSubtotal').innerText = `Rs. ${subtotal.toLocaleString()}`;
    document.getElementById('chkTotal').innerText = `Rs. ${(subtotal + chkShip).toLocaleString()}`;
    const chkShipEl = document.getElementById('chkShipping');
    if (chkShipEl) chkShipEl.innerText = chkShip === 0 ? 'FREE 🎉' : 'Rs. 250';

    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        if (document.getElementById('chkName')) document.getElementById('chkName').value = user.name || '';
        if (document.getElementById('chkEmail')) document.getElementById('chkEmail').value = user.email || '';
    }

    document.getElementById('checkoutSection').classList.remove('hidden-section');
    const closeCheckout = () => document.getElementById('checkoutSection').classList.add('hidden-section');
    if (isCartOpen) {
        document.getElementById('cartDrawer').classList.add('translate-x-full');
        document.getElementById('cartOverlay').classList.add('hidden');
        replaceTopAppLayer('checkout', closeCheckout);
    } else {
        pushAppLayer('checkout', closeCheckout);
    }
}

function hideCheckout() { goBack(); }

async function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    if (!code) { showCouponMsg('Please enter a promo code.', 'error'); return; }
    const btn = document.getElementById('applyCouponBtn');
    btn.textContent = '...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/coupons/apply`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, subtotal: currentCheckoutSubtotal })
        });
        const data = await res.json();
        if (res.ok && data.valid) {
            appliedCoupon = data;
            const label = data.discount_type === 'percent' ? `${data.discount_value}% off` : `Rs. ${data.discount_value} off`;
            showCouponMsg(`✓ ${label} applied — saving Rs. ${data.discount_amount}!`, 'success');
            updateCheckoutTotal();
        } else {
            appliedCoupon = null;
            showCouponMsg(data.error || 'Invalid promo code.', 'error');
            updateCheckoutTotal();
        }
    } catch { showCouponMsg('Connection error. Please try again.', 'error'); }
    finally { btn.textContent = 'APPLY'; btn.disabled = false; }
}

function showCouponMsg(text, type) {
    const el = document.getElementById('couponMsg');
    el.textContent = text;
    el.className = `mt-2 text-[11px] font-bold tracking-wider ${type === 'success' ? 'text-green-600' : 'text-red-500'}`;
    el.classList.remove('hidden');
}

function updateCheckoutTotal() {
    const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
    const shipping = currentCheckoutSubtotal >= 2000 ? 0 : 250;
    const total = currentCheckoutSubtotal + shipping - discount;
    const discountRow = document.getElementById('discountRow');
    if (discount > 0 && discountRow) {
        discountRow.classList.remove('hidden'); discountRow.classList.add('flex');
        document.getElementById('chkDiscount').textContent = `- Rs. ${discount.toLocaleString()}`;
    } else if (discountRow) {
        discountRow.classList.add('hidden'); discountRow.classList.remove('flex');
    }
    document.getElementById('chkTotal').textContent = `Rs. ${total.toLocaleString()}`;
}

async function finishOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('placeOrderBtn');
    btn.textContent = 'PLACING ORDER...'; btn.disabled = true;
    const name = document.getElementById('chkName').value.trim();
    const phone = document.getElementById('chkPhone').value.trim();
    const address = document.getElementById('chkAddress').value.trim();
    if (!name || !phone || !address) { alert('Please fill in Name, Phone, and Address.'); btn.textContent = 'PLACE ORDER'; btn.disabled = false; return; }
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    const emailEl = document.getElementById('chkEmail');
    const email = loggedUser ? loggedUser.email : (emailEl ? emailEl.value.trim() : '');
    const itemsToProcess = directBuyItem ? [directBuyItem] : cartItems;
    const subtotal = itemsToProcess.reduce((sum, item) => sum + ((item.sale_price || item.price) * item.quantity), 0);
    const shipping = subtotal >= 2000 ? 0 : 250;
    const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
    const orderPayload = {
        name, email, phone, address, subtotal, shipping, discount, total: subtotal + shipping - discount,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        items: itemsToProcess.map(item => ({ product_id: item.id, product_name: item.name, size: item.cartSize, color: item.color, price: item.sale_price || item.price, quantity: item.quantity, image: item.images[0] }))
    };
    document.getElementById('checkoutSection').classList.add('hidden-section');
    document.getElementById('orderLoadingState').classList.remove('hidden');
    document.getElementById('orderSuccessState').classList.add('hidden');
    document.getElementById('successSection').classList.remove('hidden-section');
    window.scrollTo({ top: 0 });
    replaceTopAppLayer('success', () => document.getElementById('successSection').classList.add('hidden-section'));
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/orders`, { method: 'POST', headers, body: JSON.stringify(orderPayload) });
        if (res.ok) {
            const data = await res.json();
            appliedCoupon = null;
            setTimeout(() => {
                document.getElementById('orderLoadingState').classList.add('hidden');
                const successState = document.getElementById('orderSuccessState');
                successState.classList.remove('hidden');
                const orderIdEl = document.getElementById('successOrderId');
                if (orderIdEl) orderIdEl.textContent = '#' + data.orderId;
                launchConfetti();
            }, 1000);
        } else {
            const errData = await res.json();
            alert('Failed to place order: ' + errData.error);
            goBack();
        }
    } catch { alert('Connection error. Please check your internet and try again.'); goBack(); }
    finally { btn.textContent = 'PLACE ORDER'; btn.disabled = false; }
}

function launchConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    const colors = ['#000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    for (let i = 0; i < 40; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.cssText = `left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${Math.random() * 0.8}s;animation-duration:${1.2 + Math.random() * 0.8}s;width:${6 + Math.random() * 6}px;height:${6 + Math.random() * 6}px;border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`;
        container.appendChild(piece);
    }
    setTimeout(() => { container.innerHTML = ''; }, 3000);
}

function shopAgain() {
    cartItems = [];
    directBuyItem = null;
    updateCartUI();
    goBack();
    resetHomeLogic(false);
}

// ─── My Orders ────────────────────────────────────────────────────────────────
function showMyOrders() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { toggleAuth(); return; }
    const section = document.getElementById('myOrdersSection');
    section.classList.remove('hidden-section');
    const close = () => section.classList.add('hidden-section');
    const isMenuOpen = !document.getElementById('sidebar').classList.contains('-translate-x-full');
    if (isMenuOpen) { document.getElementById('sidebar').classList.add('-translate-x-full'); replaceTopAppLayer('myOrders', close); }
    else pushAppLayer('myOrders', close);
    loadMyOrders();
}
function hideMyOrders() { goBack(); }

async function loadMyOrders() {
    const token = localStorage.getItem('token');
    if (!token) return;
    document.getElementById('myOrdersLoading').classList.remove('hidden');
    document.getElementById('myOrdersEmpty').classList.add('hidden');
    document.getElementById('myOrdersList').classList.add('hidden');
    try {
        const res = await fetch(`${API_URL}/my-orders`, { headers: { 'Authorization': `Bearer ${token}` } });
        const orders = await res.json();
        document.getElementById('myOrdersLoading').classList.add('hidden');
        if (!orders.length) { document.getElementById('myOrdersEmpty').classList.remove('hidden'); return; }
        const list = document.getElementById('myOrdersList');
        list.classList.remove('hidden');
        list.innerHTML = orders.map(o => {
            const items = JSON.parse(o.items || '[]');
            const statusMap = { Pending: 'status-pending', Shipped: 'status-shipped', Delivered: 'status-delivered', Cancelled: 'status-cancelled' };
            const iconMap = { Pending: 'fa-clock', Shipped: 'fa-truck', Delivered: 'fa-circle-check', Cancelled: 'fa-xmark' };
            const date = new Date(o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
            return `<div class="bg-white border rounded-lg overflow-hidden shadow-sm">
                <div class="flex items-center justify-between px-5 py-4 border-b">
                    <div><p class="text-[10px] text-gray-400 tracking-widest uppercase font-bold">Order #${o.id}</p><p class="text-[11px] text-gray-400 mt-0.5">${date}</p></div>
                    <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${statusMap[o.status] || ''} border"><i class="fa-solid ${iconMap[o.status] || 'fa-circle'}"></i> ${o.status}</span>
                </div>
                <div class="px-5 py-3 space-y-2">
                    ${items.map(item => `<div class="flex justify-between text-xs"><span class="text-gray-700">${item.product_name} <span class="text-gray-400">×${item.quantity}</span> <span class="text-gray-400 text-[10px]">(${item.size})</span></span><span class="font-bold">Rs. ${(item.price * item.quantity).toLocaleString()}</span></div>`).join('')}
                </div>
                <div class="flex justify-between px-5 py-3 bg-gray-50 border-t">
                    <span class="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Total</span>
                    <span class="font-bold text-sm">Rs. ${(o.total || 0).toLocaleString()}</span>
                </div>
                ${o.status === 'Pending' ? `<div class="px-5 py-3 border-t"><button onclick="cancelOrder(${o.id})" class="w-full border border-red-400 text-red-500 hover:bg-red-500 hover:text-white py-2.5 text-[11px] font-bold tracking-widest uppercase transition cursor-pointer rounded-sm"><i class="fa-solid fa-xmark mr-1"></i>Cancel Order</button></div>` : ''}
            </div>`;
        }).join('');
    } catch { document.getElementById('myOrdersLoading').classList.add('hidden'); document.getElementById('myOrdersEmpty').classList.remove('hidden'); }
}

async function cancelOrder(orderId) {
    if (!confirm('Cancel this order?')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/my-orders/${orderId}/cancel`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast('Order cancelled', 'fa-xmark', 'red'); loadMyOrders(); }
        else { const d = await res.json(); alert(d.error || 'Could not cancel.'); }
    } catch { alert('Connection error.'); }
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function showAdminPanel() {
    const isMenuOpen = !document.getElementById('sidebar').classList.contains('-translate-x-full');
    const panel = document.getElementById('adminSection');
    panel.classList.remove('hidden-section');
    const closeAdmin = () => panel.classList.add('hidden-section');
    if (isMenuOpen) { document.getElementById('sidebar').classList.add('-translate-x-full'); replaceTopAppLayer('admin', closeAdmin); }
    else pushAppLayer('admin', closeAdmin);
    loadAdminDashboard();
    loadAdminCoupons();
    loadAdminProducts();
    loadAdminCustomers();
}
function hideAdminPanel() { goBack(); }

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('admin-' + tab).classList.add('active');
}

function filterOrdersByStatus() {
    const val = document.getElementById('orderStatusFilter').value;
    const rows = document.querySelectorAll('#adminOrdersTable tr');
    rows.forEach(row => {
        if (val === 'All') { row.style.display = ''; return; }
        const statusCell = row.querySelector('td:nth-child(5)');
        if (statusCell && statusCell.textContent.trim().includes(val)) row.style.display = '';
        else if (statusCell) row.style.display = 'none';
    });
}

async function loadAdminDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const [orderRes, statsRes] = await Promise.all([
            fetch(`${API_URL}/admin/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (!orderRes.ok || !statsRes.ok) return;
        const orders = await orderRes.json();
        const stats = await statsRes.json();
        allAdminOrders = orders;
        document.getElementById('adminTotalRevenue').innerText = `Rs. ${(stats.revenue || 0).toLocaleString()}`;
        document.getElementById('adminTotalOrders').innerText = stats.totalOrders || 0;
        document.getElementById('adminPendingOrders').innerText = stats.pendingOrders || 0;
        document.getElementById('adminTotalCustomers').innerText = stats.customers || 0;

        const tbody = document.getElementById('adminOrdersTable');
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No orders yet.</td></tr>';
            return;
        }
        tbody.innerHTML = orders.map(order => {
            const items = JSON.parse(order.items || '[]');
            const date = new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
            const timeStr = new Date(order.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
            const statusMap = { Pending: 'status-pending', Shipped: 'status-shipped', Delivered: 'status-delivered', Cancelled: 'status-cancelled' };
            const actions = order.status === 'Pending'
                ? `<button onclick="updateOrderStatus(${order.id},'Shipped')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Ship</button>
                   <button onclick="updateOrderStatus(${order.id},'Delivered')" class="bg-green-600 hover:bg-green-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Deliver</button>
                   <button onclick="updateOrderStatus(${order.id},'Cancelled')" class="bg-red-500 hover:bg-red-600 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Cancel</button>`
                : order.status === 'Shipped'
                ? `<button onclick="updateOrderStatus(${order.id},'Delivered')" class="bg-green-600 hover:bg-green-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Delivered</button>`
                : order.status === 'Cancelled'
                ? `<button onclick="updateOrderStatus(${order.id},'Pending')" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Re-Open</button>`
                : `<span class="text-[9px] text-green-500 font-bold uppercase">✓ Done</span>`;
            const totalDisplay = order.discount > 0 ? `Rs. ${order.total} <span class="text-green-600 font-bold text-[9px] ml-1">(-${order.discount})</span>` : `Rs. ${order.total}`;
            return `<tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="p-4 font-bold text-gray-400 font-mono text-[11px]">#${order.id}<br><span class="text-[9px] text-gray-300">${date} ${timeStr}</span></td>
                <td class="p-4"><div class="font-bold text-black uppercase text-[11px]">${order.name}</div><div class="text-gray-400 text-[10px] mt-0.5">${order.phone}</div><div class="text-gray-500 text-[10px] mt-0.5 max-w-[160px] leading-tight truncate">${order.address}</div></td>
                <td class="p-4 max-w-[220px]">${items.map(it => `<div class="text-[10px] flex items-center gap-1.5 mb-0.5"><img src="${it.image}" class="w-6 h-7 object-cover rounded"><span>${it.product_name} (${it.size}) <span class="text-red-500 font-bold">×${it.quantity}</span></span></div>`).join('')}</td>
                <td class="p-4 font-bold text-[12px]">${totalDisplay}${order.coupon_code ? `<div class="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-0.5 inline-block font-bold">${order.coupon_code}</div>` : ''}</td>
                <td class="p-4"><span class="px-2.5 py-1.5 rounded-full font-bold text-[9px] uppercase border ${statusMap[order.status] || ''}">${order.status}</span></td>
                <td class="p-4 text-right space-x-1 whitespace-nowrap">${actions}</td>
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function updateOrderStatus(orderId, nextStatus) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/orders/${orderId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) { showToast(`Status → ${nextStatus}`, 'fa-check'); loadAdminDashboard(); }
        else alert('Failed to update order status.');
    } catch { alert('Connection error.'); }
}

// ─── Admin: Products ──────────────────────────────────────────────────────────
async function loadAdminProducts() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/products`, { headers: { 'Authorization': `Bearer ${token}` } });
        const prods = await res.json();
        const tbody = document.getElementById('adminProductsTable');
        if (!prods.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400 text-xs uppercase tracking-widest">No products found.</td></tr>';
            return;
        }
        tbody.innerHTML = prods.map(p => {
            const saleDisplay = p.sale_price ? `<span class="text-green-600 font-bold text-xs">Rs. ${p.sale_price}</span><span class="line-through text-gray-400 text-[10px] ml-1">Rs. ${p.price}</span>` : `<span class="text-xs">Rs. ${p.price}</span>`;
            const unavailCount = (p.unavailable_sizes || []).length;
            const stockBadge = unavailCount > 0 ? `<span class="text-red-500 text-[9px] font-bold uppercase bg-red-50 px-1.5 py-0.5 rounded">${unavailCount} unavail.</span>` : `<span class="text-green-600 text-[9px] font-bold uppercase bg-green-50 px-1.5 py-0.5 rounded">All in stock</span>`;
            const activeBadge = p.is_active ? '<span class="text-green-600 text-[9px] font-bold uppercase">Active</span>' : '<span class="text-gray-400 text-[9px] font-bold uppercase">Hidden</span>';
            const flags = [p.is_best_seller ? '⭐' : '', p.is_new ? '🆕' : '', p.is_flash_sale ? '🔥' : ''].filter(Boolean).join(' ');
            return `<tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="p-3">
                    <div class="flex items-center gap-3">
                        <img src="${p.images[0] || ''}" class="w-10 h-12 object-cover rounded border" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2248%22><rect fill=%22%23f3f4f6%22 width=%2240%22 height=%2248%22/></svg>'">
                        <div>
                            <div class="font-bold text-[11px] uppercase">${p.name}</div>
                            <div class="text-[9px] text-gray-400">${p.gender} · ${p.category}</div>
                            ${flags ? `<div class="text-[9px] mt-0.5">${flags}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="p-3 text-[11px]"><span class="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold text-[9px] uppercase">${p.category}</span></td>
                <td class="p-3">${saleDisplay}</td>
                <td class="p-3">${p.sale_type ? `<span class="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">${p.sale_type}</span>` : '<span class="text-[9px] text-gray-300">No sale</span>'}</td>
                <td class="p-3">${stockBadge}</td>
                <td class="p-3">${activeBadge}</td>
                <td class="p-3 text-right whitespace-nowrap space-x-1">
                    <button onclick="showEditProductModal(${p.id})" class="bg-gray-800 hover:bg-black text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Edit</button>
                    <button onclick="toggleProductActive(${p.id})" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">${p.is_active ? 'Hide' : 'Show'}</button>
                    <button onclick="deleteAdminProduct(${p.id})" class="bg-red-500 hover:bg-red-600 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Delete</button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error('Failed to load admin products:', e); }
}

function showAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('editProductId').value = '';
    document.getElementById('pName').value = '';
    document.getElementById('pGender').value = '';
    document.getElementById('pCategory').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pSalePrice').value = '';
    document.getElementById('pSaleType').value = '';
    document.getElementById('pColor').value = '';
    document.getElementById('pColorHex').value = '#000000';
    document.getElementById('pDesc').value = '';
    document.getElementById('pImages').value = '';
    document.getElementById('pBestSeller').checked = false;
    document.getElementById('pNewArrival').checked = false;
    document.getElementById('pFlashSale').checked = false;
    document.getElementById('pActive').checked = true;
    document.querySelectorAll('.unav-size-cb').forEach(cb => cb.checked = false);
    document.getElementById('productModal').classList.remove('hidden-section');
}

async function showEditProductModal(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/products`, { headers: { 'Authorization': `Bearer ${token}` } });
        const prods = await res.json();
        const p = prods.find(x => x.id === id);
        if (!p) { alert('Product not found.'); return; }
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('editProductId').value = p.id;
        document.getElementById('pName').value = p.name || '';
        document.getElementById('pGender').value = p.gender || '';
        document.getElementById('pCategory').value = p.category || '';
        document.getElementById('pPrice').value = p.price || '';
        document.getElementById('pSalePrice').value = p.sale_price || '';
        document.getElementById('pSaleType').value = p.sale_type || '';
        document.getElementById('pColor').value = p.color || '';
        document.getElementById('pColorHex').value = p.color_hex || '#000000';
        document.getElementById('pDesc').value = p.description || '';
        document.getElementById('pImages').value = (p.images || []).join('\n');
        document.getElementById('pBestSeller').checked = p.is_best_seller;
        document.getElementById('pNewArrival').checked = p.is_new;
        document.getElementById('pFlashSale').checked = p.is_flash_sale;
        document.getElementById('pActive').checked = p.is_active;
        const unavail = p.unavailable_sizes || [];
        document.querySelectorAll('.unav-size-cb').forEach(cb => { cb.checked = unavail.includes(cb.value); });
        document.getElementById('productModal').classList.remove('hidden-section');
    } catch (e) { alert('Failed to load product.'); }
}

function closeProductModal() { document.getElementById('productModal').classList.add('hidden-section'); }

async function saveProduct() {
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('pName').value.trim();
    const gender = document.getElementById('pGender').value;
    const category = document.getElementById('pCategory').value;
    const price = document.getElementById('pPrice').value;
    if (!name || !gender || !category || !price) { alert('Please fill Name, Gender, Category and Price.'); return; }
    const imagesRaw = document.getElementById('pImages').value.trim();
    const images = imagesRaw ? imagesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const unavailableSizes = [...document.querySelectorAll('.unav-size-cb:checked')].map(cb => cb.value);
    const payload = {
        name, gender, category, price: parseFloat(price),
        sale_price: document.getElementById('pSalePrice').value ? parseFloat(document.getElementById('pSalePrice').value) : null,
        sale_type: document.getElementById('pSaleType').value.trim(),
        color: document.getElementById('pColor').value.trim(),
        color_hex: document.getElementById('pColorHex').value,
        description: document.getElementById('pDesc').value.trim(),
        images, sizes: ['S', 'M', 'L', 'XL'], unavailable_sizes: unavailableSizes,
        is_best_seller: document.getElementById('pBestSeller').checked,
        is_new: document.getElementById('pNewArrival').checked,
        is_flash_sale: document.getElementById('pFlashSale').checked,
        is_active: document.getElementById('pActive').checked,
    };
    const token = localStorage.getItem('token');
    const btn = document.getElementById('saveProductBtn');
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        const url = id ? `${API_URL}/admin/products/${id}` : `${API_URL}/admin/products`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (res.ok) {
            showToast(id ? 'Product updated!' : 'Product created!', 'fa-check');
            closeProductModal();
            loadAdminProducts();
            await loadProducts(); // refresh storefront
        } else {
            const d = await res.json();
            alert(d.error || 'Failed to save product.');
        }
    } catch { alert('Connection error.'); }
    finally { btn.textContent = 'Save Product'; btn.disabled = false; }
}

async function toggleProductActive(id) {
    const token = localStorage.getItem('token');
    try {
        await fetch(`${API_URL}/admin/products/${id}/toggle`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        showToast('Visibility toggled', 'fa-eye');
        loadAdminProducts();
        await loadProducts();
    } catch { alert('Failed.'); }
}

async function deleteAdminProduct(id) {
    if (!confirm('Permanently delete this product? This cannot be undone.')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            showToast('Product deleted', 'fa-trash', 'red');
            loadAdminProducts();
            await loadProducts();
        }
    } catch { alert('Failed.'); }
}

// ─── Admin: Coupons ────────────────────────────────────────────────────────────
function toggleNewCouponForm() {
    const form = document.getElementById('newCouponForm');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
        document.getElementById('newCouponCode').value = '';
        document.getElementById('newCouponValue').value = '';
        document.getElementById('newCouponMin').value = '';
    }
}

async function loadAdminCoupons() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/coupons`, { headers: { 'Authorization': `Bearer ${token}` } });
        const coupons = await res.json();
        const tbody = document.getElementById('adminCouponsTable');
        if (!coupons.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-400 text-xs uppercase tracking-widest">No promo codes yet.</td></tr>';
            return;
        }
        tbody.innerHTML = coupons.map(c => {
            const discountStr = c.discount_type === 'percent' ? `${c.discount_value}% off` : `Rs. ${c.discount_value} off`;
            const activeClass = c.is_active ? 'text-green-600 bg-green-50 border-green-200' : 'text-gray-400 bg-gray-100 border-gray-200';
            return `<tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="p-4 font-mono font-bold text-black tracking-widest text-[11px]">${c.code}</td>
                <td class="p-4 font-bold text-xs">${discountStr}</td>
                <td class="p-4 text-gray-500 text-[11px]">${Number(c.min_order) > 0 ? 'Rs. ' + c.min_order : 'Any'}</td>
                <td class="p-4 text-gray-500 text-[11px]">${c.usage_count}</td>
                <td class="p-4"><span class="px-2.5 py-1 rounded-full font-bold text-[9px] uppercase border ${activeClass}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
                <td class="p-4 text-right space-x-1 whitespace-nowrap">
                    <button onclick="toggleAdminCoupon(${c.id})" class="bg-gray-600 hover:bg-gray-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">${c.is_active ? 'Disable' : 'Enable'}</button>
                    <button onclick="deleteAdminCoupon(${c.id})" class="bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition cursor-pointer uppercase">Delete</button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function createAdminCoupon() {
    const token = localStorage.getItem('token');
    const code = document.getElementById('newCouponCode').value.trim();
    const discount_type = document.getElementById('newCouponType').value;
    const discount_value = document.getElementById('newCouponValue').value;
    const min_order = document.getElementById('newCouponMin').value || '0';
    if (!code || !discount_value) { alert('Fill in Code and Discount Value.'); return; }
    try {
        const res = await fetch(`${API_URL}/admin/coupons`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ code, discount_type, discount_value, min_order }) });
        if (res.ok) { showToast('Coupon created!', 'fa-tag'); toggleNewCouponForm(); loadAdminCoupons(); }
        else { const d = await res.json(); alert(d.error || 'Failed.'); }
    } catch { alert('Server error.'); }
}

async function toggleAdminCoupon(id) {
    const token = localStorage.getItem('token');
    try { await fetch(`${API_URL}/admin/coupons/${id}/toggle`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); loadAdminCoupons(); }
    catch { alert('Failed.'); }
}

async function deleteAdminCoupon(id) {
    if (!confirm('Delete this coupon?')) return;
    const token = localStorage.getItem('token');
    try { const res = await fetch(`${API_URL}/admin/coupons/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) { showToast('Deleted', 'fa-trash'); loadAdminCoupons(); } }
    catch { alert('Failed.'); }
}

// ─── Admin: Customers ─────────────────────────────────────────────────────────
async function loadAdminCustomers() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/customers`, { headers: { 'Authorization': `Bearer ${token}` } });
        const customers = await res.json();
        const tbody = document.getElementById('adminCustomersTable');
        if (!customers.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400 text-xs uppercase tracking-widest">No registered customers yet.</td></tr>';
            return;
        }
        tbody.innerHTML = customers.map(c => {
            const date = new Date(c.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
            return `<tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="p-4 font-bold text-[11px] uppercase">${c.name || '—'}</td>
                <td class="p-4 text-gray-500 text-[11px]">@${c.username || '—'}</td>
                <td class="p-4 text-[11px]">${c.email}</td>
                <td class="p-4 text-gray-500 text-[11px]">${c.phone || '—'}</td>
                <td class="p-4 text-gray-400 text-[10px]">${date}</td>
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window.onload = () => {
    try {
        const savedCart = JSON.parse(localStorage.getItem('rift_cart') || '[]');
        cartItems = Array.isArray(savedCart) ? savedCart.filter(item => item && item.id && item.quantity > 0) : [];
    } catch {
        cartItems = [];
        localStorage.removeItem('rift_cart');
    }
    updateCartUI();
    syncUserUI();
    updateWishBadge();
    history.replaceState({ view: 'home', cat: 'Featured', page: 1, search: '' }, '', '');
    loadProducts();
};
