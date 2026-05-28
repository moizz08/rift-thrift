let appLayers = []; 
let currentBaseCategory = 'Featured'; 
let currentFilterOption = 'Featured'; 
let currentSubCategory = 'All'; 
let currentPage = 1;

// API Connection String works relative to current domain
const API_URL = window.location.origin + "/api";

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

function goBack() {
    history.back(); 
}

function clearAllLayers() {
    while(appLayers.length > 0) {
        const layer = appLayers.pop();
        layer.closeFunc(true); 
    }
}

function updateMainState(push = true) {
    const query = document.getElementById('desktopSearchInput').value || document.getElementById('mobileSearchInput').value;
    const stateObj = { 
        view: 'home', 
        cat: currentBaseCategory, 
        page: currentPage, 
        search: query 
    };
    if (push) {
        history.pushState(stateObj, '', '');
    } else {
        history.replaceState(stateObj, '', '');
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

        document.getElementById('infoSection').classList.add('hidden-section');
        document.getElementById('detailSection').classList.add('hidden-section');
        document.getElementById('checkoutSection').classList.add('hidden-section');
        document.getElementById('successSection').classList.add('hidden-section');
        document.getElementById('adminSection').classList.add('hidden-section');
        document.getElementById('homeSection').style.display = 'block';

        updateActiveMenu();
        applyFilters(false); 
    } else {
        resetHomeLogic(true);
    }
});

const products = [
    { id: 1, gender: 'Men', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', name: 'Classic Indigo Denim', price: 1450, color: 'Dark Blue', colorHex: '#1e3a8a', desc: 'A timeless classic indigo denim tailored for a perfect fit.', images:['https://i.ibb.co/FtvPG7V/1777643485852-2.jpg', 'https://i.ibb.co/Rk2YHYHJ/1777643485852-3.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 2, gender: 'Men', cat: 'Cloud Baggy', isBestSeller: true, isNew: true, isFlashSale: false, saleType: '', name: 'Baggy Cloud Grey', price: 1750, color: 'Grey', colorHex: '#9ca3af', desc: 'Experience ultimate comfort with our signature baggy fit.', images:['https://i.ibb.co/Rpf9ry0V/1777643485852-4.jpg', 'https://i.ibb.co/RGdV978P/1777643485852-5.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 3, gender: 'Men', cat: 'Skinny', isBestSeller: false, isNew: true, isFlashSale: true, saleType: 'Flash Sale', name: 'Midnight Skinny Fit', price: 1300, color: 'Black', colorHex: '#000000', desc: 'Sleek midnight black skinny jeans featuring stretchable fabric.', images:['https://i.ibb.co/HpYF7xZv/1777646614740-4.jpg', 'https://i.ibb.co/4LHSsFB/1777646614740-5.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 4, gender: 'Men', cat: 'Shorts', isBestSeller: false, isNew: false, isFlashSale: true, saleType: 'Flash Sale', name: 'Cargo Summer Shorts', price: 850, color: 'Khaki', colorHex: '#d2b48c', desc: 'Breathable cargo shorts equipped with multi-pocket utility.', images:['https://i.ibb.co/1t3fGpSY/1777646614740-2.jpg', 'https://i.ibb.co/JTpwXVk/1777646614740-3.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 5, gender: 'Women', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', name: 'High Waist Mom Denim', price: 1600, color: 'Light Blue', colorHex: '#93c5fd', desc: 'Vintage-inspired high waist mom jeans offering a flattering silhouette.', images:['https://i.ibb.co/1trshmtP/1777644849044-3.jpg', 'https://i.ibb.co/mWsy1Yw/1777644849044-4.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 6, gender: 'Women', cat: 'Cloud Baggy', isBestSeller: true, isNew: true, isFlashSale: true, saleType: 'Flash Sale', name: 'Women Cloud Baggy', price: 1850, color: 'Beige', colorHex: '#f5f5dc', desc: 'Our famous cloud baggy jeans, effortlessly chic.', images:['https://i.ibb.co/FLmBc1ht/1777644849044-5.jpg', 'https://i.ibb.co/847fZcVZ/1777644849044-2.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 7, gender: 'Women', cat: 'Skinny', isBestSeller: false, isNew: true, isFlashSale: false, saleType: '', name: 'Stretch Skinny Black', price: 1400, color: 'Black', colorHex: '#000000', desc: 'Form-fitting black stretch skinny jeans to contour your shape perfectly.', images:['https://i.ibb.co/C32RXN4W/1777646811161-2.jpg', 'https://i.ibb.co/0RqpkmkM/1777646811161-3.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 8, gender: 'Women', cat: 'Shorts', isBestSeller: false, isNew: false, isFlashSale: true, saleType: 'Flash Sale', name: 'Vintage Denim Shorts', price: 950, color: 'Blue', colorHex: '#3b82f6', desc: 'Classic cut-off denim shorts boasting frayed edges.', images:['https://i.ibb.co/s4vQvY4/1777646811161-4.jpg', 'https://i.ibb.co/qFy9tvhD/1777646811161-6.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 9, gender: 'Kids', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', name: 'Junior Rugged Denim', price: 1100, color: 'Blue', colorHex: '#2563eb', desc: 'Durable and play-ready rugged denim for active kids.', images:['https://i.ibb.co/ycnKD4KZ/Chat-GPT-Image-May-1-2026-08-41-38-PM-2.jpg', 'https://i.ibb.co/zHj3Cx9z/Chat-GPT-Image-May-1-2026-08-41-38-PM-3.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 10, gender: 'Kids', cat: 'Baggy', isBestSeller: true, isNew: true, isFlashSale: true, saleType: 'Flash Sale', name: 'Kids Baggy Cloud', price: 1200, color: 'Blue Wash', colorHex: '#60a5fa', desc: 'A miniature version of our famous baggy cloud jeans.', images:['https://i.ibb.co/LXyntFQG/Chat-GPT-Image-May-1-2026-08-41-38-PM-4.jpg', 'https://i.ibb.co/cSRHFzVZ/Chat-GPT-Image-May-1-2026-08-41-38-PM-5.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 11, gender: 'Kids', cat: 'Skinny', isBestSeller: false, isNew: true, isFlashSale: false, saleType: '', name: 'Junior Skinny Fit', price: 900, color: 'Black', colorHex: '#111827', desc: 'Trendy skinny jeans for kids featuring an adjustable waist.', images:['https://i.ibb.co/MyGJ3Drv/Chat-GPT-Image-May-1-2026-08-47-21-PM-4.jpg', 'https://i.ibb.co/dsQCKQ16/Chat-GPT-Image-May-1-2026-08-47-21-PM-5.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 12, gender: 'Kids', cat: 'Shorts', isBestSeller: false, isNew: false, isFlashSale: true, saleType: 'Flash Sale', name: 'Active Play Shorts', price: 650, color: 'Olive', colorHex: '#4d7c0f', desc: 'Lightweight olive shorts designed specifically for playground fun.', images:['https://i.ibb.co/mPbHCLD/Chat-GPT-Image-May-1-2026-08-47-21-PM-2.jpg', 'https://i.ibb.co/mQVQNNb/Chat-GPT-Image-May-1-2026-08-47-21-PM-3.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 13, gender: 'Men', cat: 'Shorts', isBestSeller: true, isNew: false, isFlashSale: true, saleType: 'Flash Sale', name: 'Summer Breeze Shorts', price: 500, color: 'Yellow', colorHex: '#facc15', desc: 'Brighten up your seasonal wardrobe with these vibrant yellow shorts.', images:['https://i.ibb.co/VWwns5Kx/1777647507787-2.jpg', 'https://i.ibb.co/N6nMh35N/1777647507787-3.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 14, gender: 'Women', cat: 'Baggy', isBestSeller: false, isNew: true, isFlashSale: false, saleType: '', name: 'Summer Linen Pant', price: 800, color: 'White', colorHex: '#ffffff', desc: 'Airy and elegant white linen pants for warm days.', images:['https://i.ibb.co/x8PhP2dv/1777647507787-4.jpg', 'https://i.ibb.co/qvH6rBy/1777647507787-5.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 15, gender: 'Men', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', name: 'Thick Winter Denim', price: 900, color: 'Black Wash', colorHex: '#374151', desc: 'Heavyweight black wash denim perfectly crafted to keep you well insulated.', images:['https://i.ibb.co/HDYbvkhb/1777647855994-2.jpg', 'https://i.ibb.co/fGrxw8kk/1777647855994-3.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] },
    { id: 16, gender: 'Women', cat: 'Denim', isBestSeller: true, isNew: true, isFlashSale: true, saleType: 'Flash Sale', name: 'Fleece Lined Jeans', price: 950, color: 'Dark Blue', colorHex: '#1e3a8a', desc: 'Stay warm without sacrificing any style. Cozy fleece interior lining.', images:['https://i.ibb.co/TDm4FXGk/1777647855994-4.jpg', 'https://i.ibb.co/bg5BJTJQ/1777647855994-5.jpg', 'https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'] }
];

const perPage = 8;
let cartItems = [];
let filteredData = [...products];
let cardImageIndex = {};

function render() {
    cardImageIndex = {}; 
    const grid = document.getElementById('productGrid');
    const totalPages = Math.ceil(filteredData.length / perPage);
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const displayItems = filteredData.slice(start, end);

    grid.classList.remove('grid-animate');
    void grid.offsetWidth; 
    grid.classList.add('grid-animate');

    if (displayItems.length === 0) {
        grid.innerHTML = `<div class="col-span-2 md:col-span-4 text-center py-16"><i class="fa-solid fa-box-open text-4xl text-gray-300 mb-4"></i><p class="text-gray-500 font-medium tracking-widest uppercase">No products found.</p></div>`;
    } else {
        grid.innerHTML = displayItems.map(p => `
            <div class="product-card group relative flex flex-col h-full">
                <div class="aspect-[3/4] bg-gray-100 mb-2 md:mb-3 relative flex items-center justify-center text-[10px] text-gray-300 font-bold uppercase overflow-hidden border cursor-pointer flex-shrink-0"
                    onclick="handleCardClick(event, ${p.id})"
                    ontouchstart="cardTouchStart(event, ${p.id})"
                    ontouchend="cardTouchEnd(event, ${p.id})">
                    <div class="absolute inset-0 skeleton-loader"></div>
                    <img id="card-img-${p.id}" src="${p.images[0]}" class="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-0 relative z-10" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';" onerror="this.style.display='none'">

                    <div class="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/30 z-10"></div>

                    <div id="card-dots-${p.id}" class="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 opacity-0 transition-opacity duration-300">
                        ${p.images.map((_, i) => `<div class="card-dot-${p.id} w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'} transition-all duration-200"></div>`).join('')}
                    </div>

                    <div class="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 z-20">
                        <button onclick="event.stopPropagation(); showDetail(${p.id})" class="bg-white text-black px-3 py-2 rounded shadow-lg font-bold tracking-widest text-[11px] hover:bg-black hover:text-white transition-colors">VIEW</button>
                        <button onclick="event.stopPropagation(); addCart(${p.id});" class="bg-white text-black px-3 py-2 rounded shadow-lg font-bold tracking-widest text-[11px] hover:bg-black hover:text-white transition-colors"><i class="fa-solid fa-cart-plus text-sm"></i></button>
                    </div>
                </div>
                <div class="text-center px-1 md:px-2 cursor-pointer flex-1 flex flex-col justify-between" onclick="showDetail(${p.id})">
                    <div>
                        <p class="text-[9px] md:text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-0.5 md:mb-1">${p.saleType || (p.gender + ' / ' + p.cat)}</p>
                        <h3 class="text-[12px] md:text-sm font-bold uppercase mb-0.5 md:mb-1 truncate leading-tight">${p.name}</h3>
                        <p class="text-[13px] md:text-[15px] font-bold text-black mb-0 md:mb-1">Rs. ${p.price}</p>
                    </div>
                    <button onclick="event.stopPropagation(); addCart(${p.id});" class="md:hidden w-full bg-black text-white text-[10px] py-2.5 mt-2.5 font-bold tracking-[0.2em] uppercase hover:bg-gray-800 active:scale-95 transition-all shadow-sm rounded-sm cursor-pointer flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-bag-shopping text-[9px]"></i> ADD TO CART
                    </button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('pageInfo').innerText = `PAGE ${currentPage} OUT OF ${totalPages || 1}`;
    document.getElementById('prevBtn').disabled = (currentPage === 1);
    document.getElementById('nextBtn').disabled = (currentPage === totalPages || totalPages === 0);

    if(totalPages <= 1) document.getElementById('pagination').classList.add('hidden');
    else document.getElementById('pagination').classList.remove('hidden');
}

function applyFilters(pushHistory = false) {
    const deskInput = document.getElementById('desktopSearchInput').value.toLowerCase();
    const mobInput = document.getElementById('mobileSearchInput').value.toLowerCase();
    const query = deskInput || mobInput;

    filteredData = products.filter(p => {
        if (query) {
            const match = p.name.toLowerCase().includes(query) || 
                          p.cat.toLowerCase().includes(query) || 
                          (p.saleType && p.saleType.toLowerCase().includes(query)) ||
                          (p.gender && p.gender.toLowerCase().includes(query));
            if (!match) return false;
        } else {
            if (currentBaseCategory !== 'Featured' && p.gender !== currentBaseCategory) return false;
            if (currentFilterOption === 'Best Seller' && !p.isBestSeller) return false;
            if (currentFilterOption === 'New Arrivals' && !p.isNew) return false;
            if (currentFilterOption === 'Flash Sale' && !p.isFlashSale) return false;
            if (currentFilterOption === 'Shop by Category' && currentSubCategory !== 'All') {
                if (currentSubCategory === 'Skinny Jeans' && p.cat !== 'Skinny') return false; 
                else if (currentSubCategory !== 'Skinny Jeans' && p.cat !== currentSubCategory) return false;
            }
        }
        return true;
    });

    if (query) {
        document.getElementById('catDisplay').innerText = 'SEARCH RESULTS';
    } else {
        document.getElementById('catDisplay').innerText = currentBaseCategory.toUpperCase();
    }

    render();
    const isNotDefault = currentBaseCategory !== 'Featured' || currentPage > 1 || query !== '';
    toggleHeaderBackBtn(isNotDefault);
    updateClearFilterBar();
    updateHeroBanner();

    if (pushHistory) {
        updateMainState(true);
    }
}

let searchTimeout;
function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage = 1;
        applyFilters(false);
        updateMainState(false); 
    }, 300);
}

function clearSearch(type) {
    if (type === 'desktop') {
        document.getElementById('desktopSearchInput').value = '';
        document.getElementById('desktopSearchInput').focus();
    } else {
        document.getElementById('mobileSearchInput').value = '';
        document.getElementById('mobileSearchInput').focus();
    }
    currentPage = 1;
    applyFilters(false);
    updateMainState(false);
}

function updateHeroBanner() {
    const banner = document.getElementById('heroBanner');
    if (!banner) return;
    const deskVal = document.getElementById('desktopSearchInput').value;
    const mobVal = document.getElementById('mobileSearchInput').value;
    const hasSearch = deskVal || mobVal;
    const showBanner = currentBaseCategory === 'Featured' && !hasSearch;
    banner.style.display = showBanner ? '' : 'none';
}

function navigateTo(category) {
    currentBaseCategory = category;
    currentFilterOption = 'Featured';
    currentSubCategory = 'All';
    currentPage = 1;

    updateActiveMenu();
    clearAllLayers(); 
    applyFilters(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changePage(step) {
    currentPage += step;
    applyFilters(true);
    window.scrollTo({top: 0});
}

function resetHomeLogic(isPop = false) {
    currentBaseCategory = 'Featured';
    currentFilterOption = 'Featured';
    currentSubCategory = 'All';
    currentPage = 1;

    updateActiveMenu();
    document.getElementById('desktopSearchInput').value = '';
    document.getElementById('mobileSearchInput').value = '';
    document.getElementById('desktopSearchClose').classList.add('hidden');

    clearAllLayers(); 

    document.getElementById('infoSection').classList.add('hidden-section');
    document.getElementById('detailSection').classList.add('hidden-section');
    document.getElementById('checkoutSection').classList.add('hidden-section');
    document.getElementById('successSection').classList.add('hidden-section');
    document.getElementById('adminSection').classList.add('hidden-section');
    document.getElementById('homeSection').style.display = 'block';

    applyFilters(false); 
    if (!isPop) updateMainState(true); 
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function toggleHeaderBackBtn(show) {
    const btn = document.getElementById('sectionBackBtn');
    if(btn){
        if(show) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
        } else {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    }
}

function updateActiveMenu() {
    const catItems = document.querySelectorAll('.menu-item-cat');
    catItems.forEach(el => {
        if (el.dataset.cat === currentBaseCategory) {
            el.classList.add('border-black', 'bg-gray-100', 'text-black');
            el.classList.remove('border-transparent', 'text-gray-500', 'hover:bg-gray-50');
        } else {
            el.classList.remove('border-black', 'bg-gray-100', 'text-black');
            el.classList.add('border-transparent', 'text-gray-500', 'hover:bg-gray-50');
        }
    });
}

function showDesktopSearchClose() {
    document.getElementById('desktopSearchClose').classList.remove('hidden');
}
function closeDesktopSearch() {
    document.getElementById('desktopSearchInput').value = '';
    document.getElementById('desktopSearchInput').blur();
    document.getElementById('desktopSearchClose').classList.add('hidden');
    clearSearch('desktop');
}

function toggleMobileSearch() { 
    const ms = document.getElementById('mobileSearch');
    if(ms.classList.contains('hidden')) {
        ms.classList.remove('hidden');
        ms.classList.add('flex');
        document.getElementById('mobileSearchInput').focus();
    } else {
        ms.classList.add('hidden');
        ms.classList.remove('flex');
        if (document.getElementById('mobileSearchInput').value !== '') {
            clearSearch('mobile');
        }
    }
}

function toggleMenu() {
    const el = document.getElementById('sidebar');
    if (el.classList.contains('-translate-x-full')) {
        el.classList.remove('-translate-x-full');
        pushAppLayer('menu', () => el.classList.add('-translate-x-full'));
    } else {
        goBack();
    }
}

let pendingFilterOption = 'Featured';
let pendingSubCategory = 'All';

function updateFilterDrawerUI() {
    document.querySelectorAll('input[name="filterOpt"]').forEach(r => r.checked = (r.value === pendingFilterOption));
    document.querySelectorAll('input[name="subCatOpt"]').forEach(r => r.checked = (r.value === pendingSubCategory));

    const subCatSec = document.getElementById('subCategorySection');
    if (pendingFilterOption === 'Shop by Category') {
        subCatSec.classList.remove('hidden');
    } else {
        subCatSec.classList.add('hidden');
    }
}

function toggleFilter() {
    const drawer = document.getElementById('filterDrawer');
    const overlay = document.getElementById('filterOverlay');
    if (drawer.classList.contains('translate-x-full')) {
        pendingFilterOption = currentFilterOption;
        pendingSubCategory = currentSubCategory;
        updateFilterDrawerUI();

        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');

        pushAppLayer('filter', () => {
            drawer.classList.add('translate-x-full');
            overlay.classList.add('hidden');
        });
    } else {
        goBack();
    }
}

function setFilterOpt(val) { 
    pendingFilterOption = val;
    if (val !== 'Shop by Category') pendingSubCategory = 'All'; 
    updateFilterDrawerUI(); 
}

function setSubCat(val) { 
    pendingSubCategory = val; 
    updateFilterDrawerUI(); 
}

function clearFiltersFromPage() {
    pendingFilterOption = 'Featured';
    pendingSubCategory = 'All';
    currentFilterOption = 'Featured';
    currentSubCategory = 'All';
    currentPage = 1;
    applyFilters(false);
    updateMainState(false);
}

function updateClearFilterBar() {
    const btn = document.getElementById('clearFilterBtn');
    if (!btn) return;
    const hasFilter = currentFilterOption !== 'Featured' || (currentFilterOption === 'Shop by Category' && currentSubCategory !== 'All');
    if (hasFilter) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
    } else {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
    }
}

// Applies Filter and Dismisses Drawer
function applyFilterBtn() {
    currentFilterOption = pendingFilterOption;
    currentSubCategory = pendingSubCategory;
    currentPage = 1;
    applyFilters(false);
    updateMainState(false);
    goBack(); 
}

function toggleAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        toggleUserDropdown();
        return;
    }
    const auth = document.getElementById('authModal');
    if (auth.classList.contains('hidden-section')) {
        auth.classList.remove('hidden-section');
        switchAuth('login');
        pushAppLayer('auth', () => auth.classList.add('hidden-section'));
    } else {
        goBack();
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    const isOpen = !dropdown.classList.contains('hidden');
    if (isOpen) {
        dropdown.classList.add('hidden');
    } else {
        dropdown.classList.remove('hidden');
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOutside, { once: true });
        }, 0);
    }
}

function closeDropdownOutside(e) {
    const btn = document.getElementById('userHeaderBtn');
    if (!btn.contains(e.target)) {
        document.getElementById('userDropdown').classList.add('hidden');
    }
}

function showAuthSection(section) {
    const sections = ['loginSection', 'signupSection', 'alreadyLoggedInSection', 'loginSuccessSection', 'signupSuccessSection'];
    sections.forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(section + 'Section').classList.remove('hidden');
}

function switchAuth(type) {
    if(type === 'signup') {
        showAuthSection('signup');
    } else {
        showAuthSection('login');
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            syncUserUI();
            document.getElementById('loginSuccessMsg').innerText = 'WELCOME BACK, ' + data.user.name.split(' ')[0].toUpperCase() + '!';
            showAuthSection('loginSuccess');
        } else {
            alert(data.error || 'Authentication Failed');
        }
    } catch (err) {
        alert('Server unreachable at this moment');
    }
}

async function handleSignupSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value;
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const phone = document.getElementById('signupPhone').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, phone, password })
        });
        const data = await res.json();
        if (res.ok) {
            const signupName = document.getElementById('signupName').value;
            document.getElementById('signupSuccessMsg').innerText = 'WELCOME, ' + signupName.split(' ')[0].toUpperCase() + '! YOUR ACCOUNT IS READY.';
            showAuthSection('signupSuccess');
            document.getElementById('signupForm').reset();
        } else {
            alert(data.error || 'Registration Failed');
        }
    } catch (err) {
        alert('Server connection error.');
    }
}

function syncUserUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    const btnText = document.getElementById('userHeaderName');
    const adminLink = document.getElementById('adminMenuLink');
    const userDropdown = document.getElementById('userDropdown');

    if (user) {
        btnText.innerText = user.name.split(' ')[0].toUpperCase();
        document.getElementById('userHeaderBtn').classList.add('hover-active');
        userDropdown.classList.add('hidden');
        const dName = document.getElementById('dropdownName');
        const dUser = document.getElementById('dropdownUsername');
        const dEmail = document.getElementById('dropdownEmail');
        if (dName) dName.innerText = user.name.toUpperCase();
        if (dUser) dUser.innerText = '@' + (user.username || '');
        if (dEmail) dEmail.innerText = user.email;

        if (user.role === 'admin') {
            adminLink.classList.remove('hidden');
        } else {
            adminLink.classList.add('hidden');
        }
    } else {
        btnText.innerText = '';
        adminLink.classList.add('hidden');
        userDropdown.classList.add('hidden');
    }
}

function showToast(message, icon = 'fa-check') {
    const toast = document.getElementById('toast');
    clearTimeout(toastTimeout);
    toast.innerHTML = `<i class="fa-solid ${icon} mr-2"></i> ${message}`;
    toast.classList.add("show");
    toastTimeout = setTimeout(() => { toast.classList.remove("show"); }, 2000);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const emailField = document.getElementById('loginEmail');
    const passField = document.getElementById('loginPassword');
    if (emailField) emailField.value = '';
    if (passField) passField.value = '';
    syncUserUI();
    resetHomeLogic(false);
    showToast('Logged out successfully', 'fa-arrow-right-from-bracket');
}

function showPage(page) {
    const isMenuOpen = !document.getElementById('sidebar').classList.contains('-translate-x-full');
    document.getElementById('homeSection').style.display = 'none';
    document.getElementById('infoSection').classList.remove('hidden-section');
    toggleHeaderBackBtn(false); 

    const title = document.getElementById('infoTitle');
    const content = document.getElementById('infoContent');

    if(page === 'policy') {
        title.innerText = 'RETURN / EXCHANGE POLICY';
        content.innerHTML = '<p>Items can be returned or exchanged within 14 days of receiving your order. Please ensure the items are unworn, unwashed, and have the original tags attached. Sale items are final and non-refundable.</p>';
    } else if(page === 'about') {
        title.innerText = 'ABOUT US';
        content.innerHTML = '<p>Welcome to RIFT THRIFT CLOTHING. We bring you the best selection of curated fashion. We believe in sustainable style and affordable prices for everyone. Starting in Karachi, we are proud to provide top quality cloud baggy jeans, denims and more.</p>';
    } else if(page === 'contact') {
        title.innerText = 'CONTACT US';
        content.innerHTML = '<p class="font-bold mt-4">Email:</p><p class="mb-4">support@riftthrift.pk</p><p class="font-bold">Phone / WhatsApp:</p><p class="mb-4">+92 300 1234567</p><p class="font-bold">Address:</p><p>RIFT THRIFT CLOTHING HQ, Karachi, Pakistan</p>';
    }
    window.scrollTo({top: 0});

    const closeInfo = () => {
        document.getElementById('infoSection').classList.add('hidden-section');
        document.getElementById('homeSection').style.display = 'block';
    };

    if (isMenuOpen) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        replaceTopAppLayer('info', closeInfo);
    } else {
        pushAppLayer('info', closeInfo);
    }
}

let selectedSize = 'M';
let toastTimeout;
let directBuyItem = null;

function toggleCart() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer.classList.contains('translate-x-full')) {
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        pushAppLayer('cart', () => {
            drawer.classList.add('translate-x-full');
            overlay.classList.add('hidden');
        });
    } else {
        goBack();
    }
}

function updateCartUI() {
    const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-badge').forEach(el => el.innerText = totalItemsCount);

    const list = document.getElementById('cartItemsList');
    let total = 0;

    if(cartItems.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center justify-center mt-12">
                <i class="fa-solid fa-cart-arrow-down text-4xl text-gray-300 mb-4 cursor-default"></i>
                <p class="text-gray-400 text-sm mb-6 font-medium cursor-default">Your cart is empty.</p>
                <button onclick="goBack()" class="bg-black text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-gray-800 transition cursor-pointer shadow rounded">Continue Shopping</button>
            </div>
        `;
        document.getElementById('cartSubtotal').innerText = `Rs. 0`;
        document.getElementById('cartTotal').innerText = `Rs. 0`;
        return;
    }

    list.innerHTML = cartItems.map((item, index) => {
        const rowTotal = item.price * item.quantity;
        total += rowTotal;

        return `
        <div class="flex gap-4 border-b pb-4">
            <div class="w-20 h-24 bg-gray-100 border flex flex-shrink-0 items-center justify-center text-[10px] text-gray-300 font-bold relative overflow-hidden">
                <img src="${item.images[0]}" class="w-full h-full object-cover" onerror="this.style.opacity='0.3'">
            </div>
            <div class="flex-1 flex flex-col justify-between py-1">
                <div>
                    <h4 class="text-[12px] font-bold uppercase truncate pr-4">${item.name}</h4>
                    <p class="text-[11px] text-gray-500 mt-1 uppercase font-medium">Size: <span class="text-black font-bold">${item.cartSize}</span> &nbsp;|&nbsp; Color: ${item.color}</p>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <div class="flex items-center gap-3 mt-1 bg-gray-50 border border-gray-200 w-fit px-2 py-1 rounded">
                        <button onclick="updateQuantity(${index}, -1)" class="text-gray-500 hover:text-black transition cursor-pointer text-xs">
                            ${item.quantity === 1 ? '<i class="fa-solid fa-trash-can text-red-500"></i>' : '<i class="fa-solid fa-minus"></i>'}
                        </button>
                        <span class="text-sm font-bold w-4 text-center">${item.quantity}</span>
                        <button onclick="updateQuantity(${index}, 1)" class="text-gray-500 hover:text-black transition cursor-pointer text-xs">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <span class="font-bold text-sm">Rs. ${rowTotal}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    let finalTotal = total + 250;
    document.getElementById('cartSubtotal').innerText = `Rs. ${total}`;
    document.getElementById('cartTotal').innerText = `Rs. ${finalTotal}`;
}

function addCart(id) {
    const p = products.find(x => x.id === id);
    const existingItemIndex = cartItems.findIndex(item => item.id === id && item.cartSize === selectedSize);

    if (existingItemIndex > -1) {
        cartItems[existingItemIndex].quantity += 1; 
    } else {
        cartItems.push({...p, cartSize: selectedSize, quantity: 1, cartId: Date.now()});
    }

    updateCartUI();
    document.querySelectorAll('.cart-icon-btn').forEach(btn => {
        btn.classList.remove('cart-shake'); 
        void btn.offsetWidth; 
        btn.classList.add('cart-shake');
        setTimeout(() => { btn.classList.remove('cart-shake'); }, 650);
    });

    const toast = document.getElementById('toast');
    clearTimeout(toastTimeout);
    toast.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Added to Cart';
    toast.classList.add("show");
    toastTimeout = setTimeout(() => { toast.classList.remove("show"); }, 1500);
}

let cardTouchStartX = 0;
let cardTouchStartY = 0;
let cardWasSwiped = false;

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
        const imgCount = p.images.filter(i => i && i !== '**********').length || p.images.length;
        if (!cardImageIndex[id]) cardImageIndex[id] = 0;

        if (diffX > 0) {
            cardImageIndex[id] = (cardImageIndex[id] + 1) % imgCount;
        } else {
            cardImageIndex[id] = (cardImageIndex[id] - 1 + imgCount) % imgCount;
        }
        swipeCardImage(id, p.images[cardImageIndex[id]], diffX > 0 ? 1 : -1, imgCount);
    } else {
        setTimeout(() => {
            const dots = document.getElementById('card-dots-' + id);
            if (dots) dots.style.opacity = '0';
        }, 2000);
    }
}

function handleCardClick(e, id) {
    if (cardWasSwiped) {
        cardWasSwiped = false;
        return;
    }
    showDetail(id);
}

function swipeCardImage(id, newSrc, direction, total) {
    const img = document.getElementById('card-img-' + id);
    if (!img) return;

    img.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
    img.style.opacity = '0';
    img.style.transform = direction > 0 ? 'translateX(-20%)' : 'translateX(20%)';

    setTimeout(() => {
        img.src = newSrc;
        img.style.transition = 'none';
        img.style.transform = direction > 0 ? 'translateX(20%)' : 'translateX(-20%)';
        img.style.opacity = '0';
        void img.offsetWidth;
        img.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        img.style.transform = 'translateX(0)';
        img.style.opacity = '1';
    }, 200);

    const currentIdx = cardImageIndex[id] || 0;
    document.querySelectorAll('.card-dot-' + id).forEach((dot, i) => {
        dot.className = dot.className.replace(/bg-white\/\d+|bg-white(?!\/)/g, '');
        dot.classList.add(i === currentIdx ? 'bg-white' : 'bg-white/50');
    });

    const dots = document.getElementById('card-dots-' + id);
    if (dots) {
        dots.style.opacity = '1';
        clearTimeout(dots._hideTimer);
        dots._hideTimer = setTimeout(() => { dots.style.opacity = '0'; }, 2500);
    }
}

function updateQuantity(index, change) {
    if(cartItems[index].quantity === 1 && change === -1) {
        cartItems.splice(index, 1);
    } else {
        cartItems[index].quantity += change;
    }
    updateCartUI();
}

function buyNow(id) {
    const p = products.find(x => x.id === id);
    directBuyItem = { ...p, cartSize: selectedSize, quantity: 1 };
    proceedToCheckout(true); 
}

function proceedToCheckout(isDirect = false) {
    let itemsToProcess = [];

    if (isDirect) {
        itemsToProcess = [directBuyItem];
    } else {
        if(cartItems.length === 0) {
            alert('Your cart is empty! Please add some products before checkout.');
            return;
        }
        itemsToProcess = cartItems;
    }

    const isCartOpen = !document.getElementById('cartDrawer').classList.contains('translate-x-full');
    const summaryItems = document.getElementById('checkoutSummaryItems');
    let subtotal = 0;

    summaryItems.innerHTML = itemsToProcess.map(item => {
        const rowTotal = item.price * item.quantity;
        subtotal += rowTotal;

        return `
        <div class="flex gap-4 items-center">
            <div class="w-14 h-16 bg-gray-200 border-shrink-0 flex items-center justify-center overflow-hidden">
                <img src="${item.images[0]}" class="w-full h-full object-cover" onerror="this.style.opacity='0.3'">
            </div>
            <div class="flex-1 flex justify-between items-center">
                <div>
                    <p class="font-bold text-xs uppercase">${item.name} <span class="text-red-500 lowercase ml-1">x${item.quantity}</span></p>
                    <p class="text-[11px] text-gray-500 mt-1 uppercase font-medium">Size: ${item.cartSize} &nbsp;|&nbsp; Color: ${item.color}</p>
                </div>
                <span class="font-bold text-sm">Rs. ${rowTotal}</span>
            </div>
        </div>
        `;
    }).join('');

    document.getElementById('chkSubtotal').innerText = `Rs. ${subtotal}`;
    document.getElementById('chkTotal').innerText = `Rs. ${subtotal + 250}`;

    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('chkName').value = user.name || "";
        document.getElementById('chkEmail').value = user.email || "";
        document.getElementById('chkPhone').value = user.phone || "";
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

async function finishOrder(e) {
    e.preventDefault(); 

    const name = document.getElementById('chkName').value;
    const email = document.getElementById('chkEmail').value;
    const phone = document.getElementById('chkPhone').value;
    const address = document.getElementById('chkAddress').value;

    const itemsToProcess = directBuyItem ? [directBuyItem] : cartItems;
    const subtotal = itemsToProcess.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 250;
    const total = subtotal + shipping;

    const orderPayload = {
        name,
        email,
        phone,
        address,
        subtotal,
        shipping,
        total,
        items: itemsToProcess.map(item => ({
            product_id: item.id,
            product_name: item.name,
            size: item.cartSize,
            color: item.color,
            price: item.price,
            quantity: item.quantity,
            image: item.images[0]
        }))
    };

    document.getElementById('checkoutSection').classList.add('hidden-section');
    document.getElementById('orderLoadingState').classList.remove('hidden');
    document.getElementById('orderSuccessState').classList.add('hidden');
    document.getElementById('successSection').classList.remove('hidden-section');
    window.scrollTo({top: 0});

    replaceTopAppLayer('success', () => {
        document.getElementById('successSection').classList.add('hidden-section');
    });

    try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderPayload)
        });

        if (res.ok) {
            setTimeout(() => {
                document.getElementById('orderLoadingState').classList.add('hidden');
                document.getElementById('orderSuccessState').classList.remove('hidden');
                document.getElementById('orderSuccessState').style.animation = 'fadeInFade 0.4s ease-out forwards';
            }, 1000);
        } else {
            const errData = await res.json();
            alert('Failed to register order: ' + errData.error);
            goBack();
        }
    } catch (err) {
        alert('Connectivity issue with central database server');
        goBack();
    }
}

function shopAgain() {
    cartItems = [];
    directBuyItem = null;
    updateCartUI();
    goBack(); 
    resetHomeLogic(false); 
}

let activeProductImages = [];
function showDetail(id) {
    savedHomeScroll = window.scrollY; 
    selectedSize = 'M';
    const p = products.find(x => x.id === id);
    activeProductImages = p.images;

    const content = document.getElementById('detailContent');
    document.getElementById('detailSection').classList.remove('hidden-section');
    window.scrollTo({top: 0});

    pushAppLayer('detail', () => {
        document.getElementById('detailSection').classList.add('hidden-section');
        setTimeout(() => window.scrollTo({ top: savedHomeScroll, behavior: 'instant' }), 0);
    });

    content.innerHTML = `
        <div class="space-y-2 md:space-y-3 w-full">
            <div class="aspect-[3/4] bg-gray-100 flex items-center justify-center relative overflow-hidden cursor-pointer rounded border border-gray-200 group no-click-effect" 
                ontouchstart="detailTouchStart(event)" 
                ontouchend="detailTouchEnd(event)"
                onclick="detailClick(event)">

                <div id="detail-img-counter" class="absolute top-3 right-3 md:top-4 md:right-4 bg-black/60 text-white text-[10px] md:text-xs px-2 py-1 rounded font-bold tracking-widest z-20 backdrop-blur-sm shadow border border-white/20">1/${activeProductImages.length}</div>

                <div class="absolute inset-0 skeleton-loader rounded z-0"></div>
                <img id="mainDetailImg" data-index="0" src="${activeProductImages[0]}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 opacity-0 relative z-10" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';">

                <div class="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-white/80 text-black w-8 h-8 md:w-10 md:h-10 flex justify-center items-center rounded-full shadow-lg hover:bg-white hover:scale-110 transition z-20"><i class="fa-solid fa-expand text-sm md:text-lg"></i></div>
            </div>
            <div class="flex gap-2 md:gap-3 justify-start">
                <div class="w-14 md:w-20 aspect-[3/4] bg-gray-100 border border-gray-200 cursor-pointer hover:border-black transition relative overflow-hidden" onclick="setMainImg(0)">
                    <div class="absolute inset-0 skeleton-loader z-0"></div>
                    <img src="${activeProductImages[0]}" class="w-full h-full object-cover opacity-0 transition-opacity duration-300 relative z-10" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';">
                </div>
                <div class="w-14 md:w-20 aspect-[3/4] bg-gray-100 border border-gray-200 cursor-pointer hover:border-black transition relative overflow-hidden" onclick="setMainImg(1)">
                    <div class="absolute inset-0 skeleton-loader z-0"></div>
                    <img src="${activeProductImages[1]}" class="w-full h-full object-cover opacity-0 transition-opacity duration-300 relative z-10" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';">
                </div>
                <div class="w-14 md:w-20 aspect-[3/4] bg-gray-100 border border-gray-200 cursor-pointer hover:border-black transition relative overflow-hidden" onclick="setMainImg(2)">
                    <div class="absolute inset-0 skeleton-loader z-0"></div>
                    <img src="${activeProductImages[2]}" class="w-full h-full object-cover opacity-0 transition-opacity duration-300 relative z-10" onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';">
                </div>
            </div>
        </div>

        <div class="flex flex-col justify-center py-2 md:py-0 px-2 md:px-0">
            <p class="text-[10px] md:text-[11px] font-bold text-gray-400 tracking-widest mb-1 md:mb-2 uppercase">${p.saleType || (p.gender + ' / ' + p.cat)}</p>
            <h2 class="logo-font text-2xl md:text-4xl font-bold mb-1.5 md:mb-2 uppercase tracking-wide leading-tight text-gray-900">${p.name}</h2>
            <p class="text-lg md:text-2xl font-bold mb-2 md:mb-3 text-black">Rs. ${p.price}</p>
            <p class="text-[12px] md:text-sm text-gray-500 font-medium mb-3 md:mb-5 leading-relaxed">${p.desc}</p>

            <div class="space-y-3 md:space-y-5 mb-4 md:mb-6 border-t border-b py-3 md:py-5 border-gray-200">
                <div>
                    <p class="text-[10px] md:text-[11px] font-bold text-gray-400 mb-2 md:mb-3 tracking-widest">SELECT SIZE</p>
                    <div class="flex gap-2 md:gap-3">
                        <button onclick="selectSizeBtn(this, 'S')" class="cursor-pointer border border-gray-300 bg-white text-black w-10 h-10 md:w-12 md:h-12 text-xs md:text-sm font-bold hover:border-black transition">S</button>
                        <button onclick="selectSizeBtn(this, 'M')" class="cursor-pointer border border-black bg-black text-white w-10 h-10 md:w-12 md:h-12 text-xs md:text-sm font-bold hover:border-black transition">M</button>
                        <button onclick="selectSizeBtn(this, 'L')" class="cursor-pointer border border-gray-300 bg-white text-black w-10 h-10 md:w-12 md:h-12 text-xs md:text-sm font-bold hover:border-black transition">L</button>
                        <button onclick="selectSizeBtn(this, 'XL')" class="cursor-pointer border border-gray-300 bg-white text-black w-10 h-10 md:w-12 md:h-12 text-xs md:text-sm font-bold hover:border-black transition">XL</button>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] md:text-[11px] font-bold text-gray-400 tracking-widest flex items-center">
                        COLOR: <span class="text-black ml-2 text-xs md:text-sm font-bold">${p.color}</span>
                        <span class="inline-block w-4 h-4 md:w-5 md:h-5 rounded-full ml-2 md:ml-3 border border-gray-300 shadow-sm" style="background-color: ${p.colorHex};"></span>
                    </p>
                </div>
            </div>

            <div class="flex flex-col gap-2 md:gap-4">
                <button onclick="addCart(${p.id})" class="cursor-pointer w-full border border-black bg-white text-black py-3 md:py-4 font-bold text-[11px] md:text-xs tracking-widest uppercase hover:bg-gray-100 transition-colors duration-300">Add to Cart</button>
                <button onclick="buyNow(${p.id})" class="cursor-pointer w-full bg-black text-white py-3 md:py-4 font-bold text-[11px] md:text-xs tracking-widest uppercase hover:bg-gray-800 transition-colors duration-300">Buy Now</button>
            </div>
        </div>
    `;
}

function hideDetail() { goBack(); }

function selectSizeBtn(btn, size) {
    const btns = btn.parentElement.querySelectorAll('button');
    btns.forEach(b => { b.classList.remove('bg-black', 'text-white'); b.classList.add('text-black', 'bg-white'); });
    btn.classList.remove('text-black', 'bg-white');
    btn.classList.add('bg-black', 'text-white');
    selectedSize = size;
}

let currentLightboxIndex = 0;
let lightboxScale = 1;

function setMainImg(index, direction = 0) {
    const mainImg = document.getElementById('mainDetailImg');

    if (direction !== 0) {
        mainImg.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        mainImg.style.opacity = '0';
        mainImg.style.transform = direction > 0 ? 'translateX(-30px)' : 'translateX(30px)';

        setTimeout(() => {
            mainImg.src = activeProductImages[index];
            mainImg.setAttribute('data-index', index);
            mainImg.style.transition = 'none';
            mainImg.style.transform = direction > 0 ? 'translateX(30px)' : 'translateX(-30px)';
            void mainImg.offsetWidth;

            mainImg.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
            mainImg.style.opacity = '1';
            mainImg.style.transform = 'translateX(0)';
        }, 250);
    } else {
        mainImg.style.transition = 'opacity 0.2s ease';
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.src = activeProductImages[index];
            mainImg.setAttribute('data-index', index);
            mainImg.style.opacity = '1';
        }, 200);
    }

    const counter = document.getElementById('detail-img-counter');
    if (counter) counter.innerText = `${index + 1}/${activeProductImages.length}`;
}

function openLightboxFromDetail() {
    const index = parseInt(document.getElementById('mainDetailImg').getAttribute('data-index'));
    openLightbox(index);
}

function openLightbox(index) {
    currentLightboxIndex = index;
    lightboxScale = 1;
    document.getElementById('lightbox').classList.remove('hidden-section');
    updateLightboxImg();
    pushAppLayer('lightbox', () => document.getElementById('lightbox').classList.add('hidden-section'));
}

function closeLightbox() { goBack(); }

function changeLightboxImg(step) {
    currentLightboxIndex += step;
    if (currentLightboxIndex < 0) currentLightboxIndex = activeProductImages.length - 1;
    if (currentLightboxIndex >= activeProductImages.length) currentLightboxIndex = 0;
    lightboxScale = 1; 
    updateLightboxImg(step);
}

function updateLightboxImg(direction = 0) {
    const img = document.getElementById('lightbox-img');
    const loader = document.getElementById('lightbox-loader');

    if (direction !== 0) {
        loader.style.display = 'flex';
        img.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        img.style.opacity = '0';
        img.style.transform = direction > 0 ? `scale(${lightboxScale}) translateX(-50px)` : `scale(${lightboxScale}) translateX(50px)`;

        setTimeout(() => {
            img.src = activeProductImages[currentLightboxIndex];
            img.style.transition = 'none';
            img.style.transform = direction > 0 ? `scale(${lightboxScale}) translateX(50px)` : `scale(${lightboxScale}) translateX(-50px)`;
            void img.offsetWidth;

            img.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
            img.style.opacity = '1';
            img.style.transform = `scale(${lightboxScale}) translateX(0)`;
        }, 250);
    } else {
        loader.style.display = 'flex';
        img.style.transition = 'opacity 0.2s ease';
        img.style.opacity = '0';
        setTimeout(() => {
            img.src = activeProductImages[currentLightboxIndex];
            img.style.transform = `scale(${lightboxScale})`;
            img.style.opacity = '1';
        }, 200);
    }

    const counter = document.getElementById('lightbox-counter');
    if (counter) counter.innerText = `${currentLightboxIndex + 1}/${activeProductImages.length}`;
}

let detailTouchStartX = 0;
let detailTouchStartY = 0;
let isDetailSwiped = false;

function detailTouchStart(e) {
    detailTouchStartX = e.changedTouches[0].screenX;
    detailTouchStartY = e.changedTouches[0].screenY;
    isDetailSwiped = false;
}

function detailTouchEnd(e) {
    let detailTouchEndX = e.changedTouches[0].screenX;
    let detailTouchEndY = e.changedTouches[0].screenY;

    let diffX = detailTouchStartX - detailTouchEndX;
    let diffY = detailTouchStartY - detailTouchEndY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        isDetailSwiped = true;
        if (diffX > 0) changeDetailImg(1);
        else changeDetailImg(-1);
    }
}

function detailClick(e) {
    if (!isDetailSwiped) openLightboxFromDetail();
    isDetailSwiped = false;
}

function changeDetailImg(step) {
    const mainImg = document.getElementById('mainDetailImg');
    let currentIndex = parseInt(mainImg.getAttribute('data-index'));
    currentIndex += step;
    if (currentIndex < 0) currentIndex = activeProductImages.length - 1;
    if (currentIndex >= activeProductImages.length) currentIndex = 0;
    setMainImg(currentIndex, step);
}

function showAdminPanel() {
    const isMenuOpen = !document.getElementById('sidebar').classList.contains('-translate-x-full');
    const adminPanel = document.getElementById('adminSection');
    adminPanel.classList.remove('hidden-section');
    loadAdminDashboard();
    const closeAdmin = () => adminPanel.classList.add('hidden-section');

    if (isMenuOpen) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        replaceTopAppLayer('admin', closeAdmin);
    } else {
        pushAppLayer('admin', closeAdmin);
    }
}

function hideAdminPanel() { goBack(); }

async function loadAdminDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return logout();

    try {
        const orderRes = await fetch(`${API_URL}/admin/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await orderRes.json();

        const statsRes = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await statsRes.json();

        if (orderRes.ok && statsRes.ok) {
            document.getElementById('adminTotalRevenue').innerText = `Rs. ${stats.revenue || 0}`;
            document.getElementById('adminTotalOrders').innerText = stats.totalOrders || 0;
            document.getElementById('adminPendingOrders').innerText = stats.pendingOrders || 0;

            const tableBody = document.getElementById('adminOrdersTable');
            if (orders.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400 font-bold uppercase tracking-widest">No order logs found in database.</td></tr>`;
                return;
            }

            tableBody.innerHTML = orders.map(order => {
                const itemsParsed = JSON.parse(order.items);
                const date = new Date(order.created_at).toLocaleString();
                const itemsListHtml = itemsParsed.map(item => 
                    `<div class="flex items-center gap-2 mb-1 border-b border-gray-50 pb-1">
                        <img src="${item.image}" class="w-8 h-10 object-cover rounded shadow-sm">
                        <span>${item.product_name} (${item.size}) <span class="text-red-500 font-bold font-mono">x${item.quantity}</span></span>
                     </div>`
                ).join('');

                const statusColor = order.status === 'Pending' ? 'text-yellow-600 bg-yellow-50' : (order.status === 'Shipped' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50');

                return `
                <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                    <td class="p-4 font-bold text-gray-400 font-mono">#${order.id}</td>
                    <td class="p-4 font-medium">
                        <div class="font-bold text-black uppercase">${order.name}</div>
                        <div class="text-gray-400 text-[10px] mt-0.5">${order.phone} | ${order.email}</div>
                        <div class="text-gray-500 text-[10px] mt-1 max-w-[200px] leading-tight">${order.address}</div>
                        <div class="text-[9px] text-gray-300 font-bold mt-1 uppercase">${date}</div>
                    </td>
                    <td class="p-4 max-w-[300px]">${itemsListHtml}</td>
                    <td class="p-4 font-bold text-black text-[13px]">Rs. ${order.total}</td>
                    <td class="p-4">
                        <span class="px-2.5 py-1 rounded-full font-bold text-[9px] uppercase ${statusColor}">${order.status}</span>
                    </td>
                    <td class="p-4 text-right space-x-1 whitespace-nowrap">
                        <button onclick="updateOrderStatus(${order.id}, 'Shipped')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition uppercase">Ship</button>
                        <button onclick="updateOrderStatus(${order.id}, 'Delivered')" class="bg-green-600 hover:bg-green-700 text-white font-bold text-[9px] py-1.5 px-2.5 rounded transition uppercase">Deliver</button>
                    </td>
                </tr>`;
            }).join('');
        }
    } catch (err) {
        alert('Data transmission error during system sync.');
    }
}

async function updateOrderStatus(orderId, nextStatus) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: nextStatus })
        });
        if (res.ok) {
            loadAdminDashboard();
        } else {
            alert('Failed to update order state.');
        }
    } catch (err) {
        alert('Server validation check failed.');
    }
}

window.onload = () => {
    updateCartUI();
    syncUserUI();
    history.replaceState({ view: 'home', cat: 'Featured', page: 1, search: '' }, '', '');
    applyFilters(false);
};