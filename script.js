// ===================================
// CHASED E-Commerce - Interactive Features
// ===================================

// Cart State Management
let cart = [];
let cartCount = 0;

// Supabase Configuration
const supabaseUrl = 'https://duhesaxygyxshmevovuj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1aGVzYXh5Z3l4c2htZXZvdnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDUzMzYsImV4cCI6MjA4Mzg4MTMzNn0.O9-gA8GhD08sD3kV_DtjNf6Yitdtxl42V5HU6Q6vn8w';

let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        console.log('CHASED: Supabase initialized successfully');
    } else {
        console.error('CHASED: Supabase SDK not found! Check Internet or CDN.');
        alert('System Error: Database connection failed (Supabase SDK missing). Please refresh.');
    }
} catch (err) {
    console.error('CHASED: checking supabase failed', err);
    console.error('CHASED: checking supabase failed', err);
}

// ===================================
// SESSION RESTORATION
// ===================================
async function restoreSession() {
    if (!supabaseClient) return;

    try {
        console.log('CHASED: Checking for existing session...');
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (session && session.user) {
            console.log('CHASED: Session restored for', session.user.email);
            updateUserUI(session.user);
            loadCartFromDB(); // Restore cart items
        } else {
            console.log('CHASED: No active session found.');
        }
    } catch (err) {
        console.error('CHASED: Session restore error:', err);
    }
}

// Image viewer state
let currentRotation = 0;
let currentZoom = 1;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    initializeCart();
    initializeSellMenu();
    initializeImageViewer();
    initializeNavigation();
    initializeHeaderSearch();
    initializeProfileForms();

    initializeProductCategories();
    initializeHeaderInteractions();

    initializeMobileCart();
    initializeHomeVideo();

    // Check for existing session (Remember Me)
    restoreSession();

    // Check for "Welcome Back" widget
    checkRecentLogin();

    // Load P2P Items
    if (typeof loadRebirthItems === 'function') {
        loadRebirthItems();
    }

    // Set home section as default landing page
    navigateToSection('home');

    console.log('CHASED: System Ready');
});

function initializeMobileCart() {
    const mobileCartBtn = document.getElementById('cart-link-mobile');
    if (mobileCartBtn) {
        mobileCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showCartModal();
        });
    }
}

// ===================================
// HOME VIDEO LOGIC
// ===================================
// ===================================
// HOME VIDEO LOGIC
// ===================================
// ===================================
// HOME VIDEO LOGIC
// ===================================
function initializeHomeVideo() {
    const video = document.getElementById('home-hero-video');
    const muteBtn = document.getElementById('video-mute-toggle');
    if (!video) return;

    // Helper to update icon
    const updateIcon = () => {
        if (!muteBtn) return;
        const icon = muteBtn.querySelector('i');
        if (video.muted) {
            icon.className = 'fas fa-volume-mute';
            muteBtn.style.background = 'rgba(0,0,0,0.5)';
        } else {
            icon.className = 'fas fa-volume-up';
            muteBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        }
    };

    // Toggle Mute on Click
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            updateIcon();
        });
    }

    // Ensure initial state is UNMUTED as requested
    video.muted = false;
    updateIcon();

    // Scroll Awareness
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Try to play unmuted
                video.muted = false;
                updateIcon();

                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('CHASED: Video playing unmuted (success).');
                    }).catch(error => {
                        console.warn('CHASED: Unmuted autoplay blocked by browser. Fallback necessary.', error);
                        // We MUST fallback to muted, otherwise the video won't play at all.
                        video.muted = true;
                        updateIcon();
                        video.play();

                        // Add one-time listener to unmute on ANY user interaction (global unlock)
                        const unlockAudio = () => {
                            video.muted = false;
                            updateIcon();
                            video.play().catch(e => console.log('Audio unlock failed', e));
                            console.log('CHASED: Audio unlocked via user interaction.');
                        };

                        // Listen for any interaction to unlock audio ASAP
                        ['click', 'touchstart', 'scroll', 'keydown'].forEach(evt =>
                            document.addEventListener(evt, unlockAudio, { capture: true, once: true })
                        );
                    });
                }
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.3 });

    observer.observe(video);
}

// ===================================
// RECENT LOGIN MEMORY
// ===================================
function checkRecentLogin() {
    const recentUser = JSON.parse(localStorage.getItem('chased_recent_user'));
    const widget = document.getElementById('recent-login-widget');
    const loginForm = document.getElementById('profile-login-form');

    if (recentUser && widget && loginForm) {
        // Populate widget
        document.getElementById('recent-avatar').textContent = recentUser.initials;
        document.getElementById('recent-name').textContent = recentUser.name;
        document.getElementById('recent-email').textContent = recentUser.email;

        // Show widget, hide form
        widget.classList.remove('hidden');
        loginForm.classList.add('hidden');

        // Handle "Continue"
        document.getElementById('recent-login-btn').addEventListener('click', () => {
            widget.classList.add('hidden');
            loginForm.classList.remove('hidden');

            // Pre-fill email
            const emailInput = document.getElementById('login-email');
            if (emailInput) {
                emailInput.value = recentUser.email;
                const passwordInput = document.getElementById('login-password');
                if (passwordInput) passwordInput.focus();
            }
        });

        // Handle "Not you?"
        document.getElementById('not-you-link').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('chased_recent_user');
            widget.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }
}

// ===================================
// SIDEBAR TOGGLE
// ===================================
function initializeSidebar() {
    const popButton = document.getElementById('popButton');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    if (popButton && sidebar && mainContent) {
        popButton.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            mainContent.classList.toggle('expanded');

            // Change icon based on state
            const icon = popButton.querySelector('i');
            if (sidebar.classList.contains('hidden')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-list-ul');
            } else {
                icon.classList.remove('fa-list-ul');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// ===================================
// SHOPPING CART FUNCTIONALITY
// ===================================
function initializeCart() {
    // Add cart icon to page if not exists
    createCartIcon();

    // Add click handlers to all "Add to Cart" buttons
    const addToCartButtons = document.querySelectorAll('.btn-primary');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', handleAddToCart);
    });

    // Add click handlers to cart overlay buttons
    const cartOverlayButtons = document.querySelectorAll('.cart-overlay-btn');
    cartOverlayButtons.forEach(button => {
        button.addEventListener('click', handleAddToCart);
    });
}

function createCartIcon() {
    // Check if cart icon already exists
    if (document.getElementById('floating-cart')) return;

    const cartHTML = `
        <div class="cart-icon-container" id="floating-cart">
            <button class="cart-button" id="cart-btn">
                <i class="fas fa-shopping-cart"></i>
                <span class="cart-count" id="cart-count">0</span>
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', cartHTML);

    // Add click handler to show cart modal
    document.getElementById('cart-btn').addEventListener('click', showCartModal);
}

function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    // Find the product card
    const productCard = event.target.closest('.product-card');
    if (!productCard) return;

    // Extract product information
    const productName = productCard.querySelector('.product-name').textContent;
    const productPrice = productCard.querySelector('.product-price').textContent;
    const productImage = productCard.querySelector('.product-image').src;

    // Create product object
    const product = {
        id: Date.now(),
        name: productName,
        price: productPrice,
        image: productImage,
        quantity: 1
    };

    // Add to cart
    cart.push(product);
    cartCount++;

    // Update cart count
    updateCartCount();

    // Persist to DB
    addToCartDB(product);

    // Visual feedback
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Added';
    button.style.backgroundColor = '#28a745';

    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '';
    }, 1500);
}

function updateCartCount() {
    const countElement = document.getElementById('cart-count');
    const mobileCountElement = document.getElementById('cart-count-mobile');

    if (countElement) {
        countElement.textContent = cartCount;
        countElement.style.transform = 'scale(1.3)';
        setTimeout(() => {
            countElement.style.transform = 'scale(1)';
        }, 200);
    }

    if (mobileCountElement) {
        mobileCountElement.textContent = cartCount;
        mobileCountElement.style.transform = 'scale(1.3)';
        setTimeout(() => {
            mobileCountElement.style.transform = 'scale(1)';
        }, 200);
    }
}

function showCartModal() {
    // Check if modal already exists
    let cartModal = document.getElementById('cart-modal');

    if (!cartModal) {
        const modalHTML = `
            <div class="modal" id="cart-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Shopping Cart</h2>
                        <button class="modal-close" id="close-cart-modal">&times;</button>
                    </div>
                    <div class="cart-items" id="cart-items-container"></div>
                    <div class="cart-total">
                        <h3>Total: <span id="cart-total-amount">£0</span></h3>
                    </div>
                    <div class="cart-actions">
                        <button class="btn btn-primary" onclick="window.openCheckout()">Proceed to Checkout</button>
                        <button class="btn btn-secondary" id="close-cart-btn">Continue Shopping</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        cartModal = document.getElementById('cart-modal');

        document.getElementById('close-cart-modal').addEventListener('click', () => {
            cartModal.classList.remove('active');
        });

        document.getElementById('close-cart-btn').addEventListener('click', () => {
            cartModal.classList.remove('active');
        });

        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                cartModal.classList.remove('active');
            }
        });
    }

    // Update cart display
    updateCartDisplay();

    // Show modal
    cartModal.classList.add('active');
}

function updateCartDisplay() {
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total-amount');

    if (!container || !totalElement) return;

    // Clear container
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem;">Your cart is empty</p>';
        totalElement.textContent = 'Â£0';
        return;
    }

    // Add cart items
    let total = 0;
    cart.forEach((item, index) => {
        // Robust parsing: remove everything except numbers and decimal point
        const price = parseFloat(item.price.toString().replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
            total += price; // Only add if valid number
        }

        const itemHTML = `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price}</p>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    });

    totalElement.textContent = `£${total.toFixed(2)}`;
}

function removeFromCart(index) {
    const itemToRemove = cart[index];

    // Remove from local array
    cart.splice(index, 1);
    cartCount--;
    updateCartCount();
    updateCartDisplay();

    // Remove from DB if logged in
    if (itemToRemove) {
        deleteFromCartDB(itemToRemove.db_id || itemToRemove.id);
    }
}

// ===================================
// CART PERSISTENCE HELPERS
// ===================================

async function loadCartFromDB() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    try {
        const { data: items, error } = await supabaseClient
            .from('cart_items')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (items && items.length > 0) {
            // Map DB items to local cart structure
            // We overwrite the local cart to avoid duplicates on reload
            cart = items.map(item => ({
                id: item.id,      // UUID from DB
                name: item.product_name,
                price: `£${item.price}`, // Format for display
                image: item.image_url,
                quantity: item.quantity,
                db_id: item.id    // Explicit DB ID reference
            }));

            cartCount = cart.length;
            updateCartCount();
            updateCartDisplay();
            console.log(`CHASED: Restored ${cart.length} items from cloud cart.`);
        }
    } catch (err) {
        console.error('CHASED: Error loading cart:', err);
    }
}

async function addToCartDB(product) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return; // Guest mode, do nothing

    // Parse numeric price safely
    const numericPrice = parseFloat(product.price.toString().replace(/[^0-9.]/g, ''));

    try {
        const { data, error } = await supabaseClient
            .from('cart_items')
            .insert({
                user_id: user.id,
                product_name: product.name,
                price: numericPrice,
                image_url: product.image,
                quantity: product.quantity,
                // If it's a rebirth item, we might assume there's a rebirth ID but we don't have it easily available in the product object yet unless we added it.
                // For now, generic storage is fine.
            })
            .select()
            .single();

        if (error) throw error;

        // Update local item with real DB ID
        const localItem = cart.find(i => i.id === product.id);
        if (localItem) {
            localItem.id = data.id;
            localItem.db_id = data.id;
        }

    } catch (err) {
        console.error('CHASED: Failed to sync item to DB:', err);
    }
}

async function deleteFromCartDB(itemId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    try {
        await supabaseClient
            .from('cart_items')
            .delete()
            .eq('id', itemId); // itemId should be the UUID
    } catch (err) {
        console.error('CHASED: Failed to remove item from DB:', err);
    }
}



// ===================================
// SELL MENU
// ===================================
function initializeSellMenu() {
    const popButton = document.getElementById('popButton');

    if (popButton) {
        // Double-click to show sell menu
        popButton.addEventListener('dblclick', showSellMenu);

        // Right-click to show sell menu
        popButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showSellMenu();
        });
    }
}

function showSellMenu() {
    let sellModal = document.getElementById('sell-modal');

    if (!sellModal) {
        const modalHTML = `
            <div class="modal" id="sell-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Sell on CHASED</h2>
                        <button class="modal-close" id="close-sell-modal">&times;</button>
                    </div>
                    <div class="sell-options">
                        <p>Choose an option below to start selling:</p>
                        <button class="btn btn-primary" onclick="window.openListingForm()"><i class="fas fa-plus-circle"></i> List New Item</button>
                        <button class="btn btn-secondary" onclick="window.openMyListings()"><i class="fas fa-box"></i> My Listings</button>
                        <button class="btn btn-secondary"><i class="fas fa-chart-line"></i> Sales Dashboard</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        sellModal = document.getElementById('sell-modal');

        document.getElementById('close-sell-modal').addEventListener('click', () => {
            sellModal.classList.remove('active');
        });

        // Close on background click
        sellModal.addEventListener('click', (e) => {
            if (e.target === sellModal) {
                sellModal.classList.remove('active');
            }
        });
    }

    sellModal.classList.add('active');
}

// Open the "List New Item" Form
function openListingForm() {
    // Close sell menu first
    const sellModal = document.getElementById('sell-modal');
    if (sellModal) sellModal.classList.remove('active');

    let listingModal = document.getElementById('listing-modal');

    if (!listingModal) {
        const modalHTML = `
            <div class="modal" id="listing-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">List Item for Rebirth</h2>
                        <button class="modal-close" id="close-listing-modal">&times;</button>
                    </div>
                    <form id="listing-form" class="dashboard-form-grid" style="display: block;">
                         <div class="form-group" style="margin-bottom: 15px;">
                            <label class="dashboard-label">Product Title</label>
                            <input type="text" id="list-title" class="dashboard-input" placeholder="e.g. Vintage Chanel Bag" required>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label class="dashboard-label">Price (Â£)</label>
                            <input type="number" id="list-price" class="dashboard-input" placeholder="e.g. 150" required>
                        </div>

                         <div class="form-group" style="margin-bottom: 15px;">
                            <label class="dashboard-label">Product Image</label>
                            <input type="file" id="list-image-file" class="dashboard-input" accept="image/*" required>
                            <p style="font-size: 0.7rem; color: #888; margin-top: 5px;">Upload a clear photo of your item.</p>
                        </div>

                        <div class="form-group" style="margin-bottom: 15px;">
                             <label class="dashboard-label">Category</label>
                             <select id="list-category" class="form-input" required>
                                <option value="dresses">Dresses</option>
                                <option value="footwear">Footwear</option>
                                <option value="tops">Tops</option>
                                <option value="jewelry">Jewelry</option>
                                <option value="pants">Pants</option>
                                <option value="hats">Hats</option>
                            </select>
                        </div>

                        <div class="form-group" style="margin-bottom: 20px;">
                            <label class="dashboard-label">Product Description</label>
                            <textarea id="list-description" class="dashboard-input" rows="4" placeholder="Describe the condition, size, and material..." required style="resize: none;"></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary btn-full">Post to Rebirth</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        listingModal = document.getElementById('listing-modal');

        // Close handlers
        document.getElementById('close-listing-modal').addEventListener('click', () => {
            listingModal.classList.remove('active');
        });

        // Form Submit
        document.getElementById('listing-form').addEventListener('submit', handlePostItem);
    }

    listingModal.classList.add('active');
}

async function handlePostItem(e) {
    e.preventDefault();

    // Check authentication
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("You must be logged in to list items!");
        return;
    }

    const title = document.getElementById('list-title').value;
    const price = document.getElementById('list-price').value;
    const fileInput = document.getElementById('list-image-file');
    const category = document.getElementById('list-category').value;
    const description = document.getElementById('list-description').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!title || !price || fileInput.files.length === 0) {
        alert("Please fill all fields");
        return;
    }

    const file = fileInput.files[0];

    // UI Feedback
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    try {
        // 1. Upload Image
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from('rebirth_images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('rebirth_images')
            .getPublicUrl(filePath);

        // 3. Insert into Database
        const { error: dbError } = await supabaseClient
            .from('rebirth_items')
            .insert({
                title: title,
                price: `Â£${price}`,
                image_url: publicUrl,
                category: category,
                description: description,
                seller_name: user.user_metadata.full_name || "Community Member",
                user_id: user.id
            });

        if (dbError) throw dbError;

        // Success
        alert("Success! Your item is live on Rebirth.");
        document.getElementById('listing-modal').classList.remove('active');
        document.getElementById('listing-form').reset();

        // Refresh items
        loadRebirthItems();

        // Switch to tab
        // Switch to rebirth section
        navigateToSection('rebirth');

    } catch (error) {
        console.error('Error posting item:', error);
        alert(`Error: ${error.message}`);
    } finally {
        submitBtn.textContent = 'Post to Rebirth';
        submitBtn.disabled = false;
    }
}

// ===================================
// REBIRTH MARKETPLACE LOGIC
// ===================================

// Rebirth Logic moved to top-level section handling

async function loadRebirthItems() {
    // Clear all grids first
    const categories = ['dresses', 'footwear', 'tops', 'jewelry', 'hats', 'pants'];
    categories.forEach(cat => {
        const grid = document.getElementById(`rebirth-${cat}-grid`);
        if (grid) grid.innerHTML = '<p>Loading...</p>';
    });

    try {
        const { data: items, error } = await supabaseClient
            .from('rebirth_items')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Reset grids to empty before filling
        categories.forEach(cat => {
            const grid = document.getElementById(`rebirth-${cat}-grid`);
            if (grid) grid.innerHTML = '';
        });

        if (!items || items.length === 0) {
            // Show empty states if no items at all
            categories.forEach(cat => {
                const grid = document.getElementById(`rebirth-${cat}-grid`);
                if (grid) grid.innerHTML = '<p style="font-style: italic; color: #666;">No items listed yet.</p>';
            });
            return;
        }

        items.forEach(item => {
            // Normalize category matching (case insensitive)
            const catKey = item.category ? item.category.toLowerCase().trim() : 'others';

            // Try specific grid first, fallback to 'dresses' (as a clearer default) or just log it
            let targetGrid = document.getElementById(`rebirth-${catKey}-grid`);

            // Debugging: Log if grid missing
            if (!targetGrid) {
                console.warn(`CHASED: No grid found for category '${catKey}' (Item: ${item.title}). Defaulting to 'dresses' for visibility.`);
                targetGrid = document.getElementById('rebirth-dresses-grid');
            }

            if (targetGrid) {
                const safeTitle = item.title.replace(/'/g, "\\'");
                const safeSellerName = (item.seller_name || 'Seller').replace(/'/g, "\\'"); // Escape for JS call
                const itemID = item.id;
                const sellerID = item.user_id; // Assumes user_id column exists

                // Check if current user is seller (requires global user context or quick check)
                const currentUserID = (supabaseClient.auth.currentUser || {}).id; // Might need async check if not cached, but usually session restore does it.
                // Better approach: We will handle logic inside onclick or simply show button and let startChat handle self-check

                const description = (item.description || "No description provided.").replace(/'/g, "\\'").replace(/\n/g, "<br>");

                const itemHTML = `
                    <div class="product-card">
                        <div class="product-image-container">
                            <img src="${item.image_url}" alt="${item.title}" class="product-image">
                            <button class="cart-overlay-btn" onclick="addToCartFromRebirth('${safeTitle}', '${item.price}', '${item.image_url}')">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                        </div>
                        <div class="product-info">
                            <div class="product-details">
                                <h3 class="product-name">${item.title}</h3>
                                <p class="product-description">Sold by @${item.seller_name || 'User'}</p>
                            </div>
                            <span class="product-price">${item.price}</span>
                        </div>
                        <div class="product-actions" style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                             <button class="btn btn-secondary btn-sm" onclick="showProductDetails('${safeTitle}', '${item.price}', '${safeSellerName}', '${description}', '${item.image_url}')" style="font-size: 0.75rem; padding: 6px;">
                                <i class="fas fa-info-circle"></i> Details
                             </button>
                             <button class="btn btn-secondary btn-sm" onclick="startChat('${sellerID}', '${itemID}', '${safeTitle}', '${safeSellerName}')" style="font-size: 0.75rem; padding: 6px;">
                                <i class="fas fa-comment-alt"></i> Message
                             </button>
                        </div>
                    </div>
                `;
                targetGrid.insertAdjacentHTML('beforeend', itemHTML);
            }
        });

        // Show empty states for specific categories that remained empty
        categories.forEach(cat => {
            const grid = document.getElementById(`rebirth-${cat}-grid`);
            if (grid && grid.children.length === 0) {
                grid.innerHTML = '<p style="font-style: italic; color: #666;">No items listed in this category yet.</p>';
            }
        });

        initializeImageViewer();

    } catch (err) {
        console.error('Error loading items:', err);
        alert(`Failed to load Rebirth items: ${err.message}`);
        categories.forEach(cat => {
            const grid = document.getElementById(`rebirth-${cat}-grid`);
            if (grid) grid.innerHTML = '<p style="color: red;">Failed to load items. Please try again later.</p>';
        });
    }
}

// Helper for Cart (since Rebirth items are dynamically loaded)
function addToCartFromRebirth(name, price, image) {
    const product = {
        id: Date.now(),
        name: name,
        price: price,
        image: image,
        quantity: 1
    };
    cart.push(product);
    cartCount++;
    updateCartCount();
    alert('Added to cart!');
}

function showProductDetails(title, price, seller, description, image) {
    let detailsModal = document.getElementById('details-modal');

    if (!detailsModal) {
        const modalHTML = `
            <div class="modal" id="details-modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Product Details</h2>
                        <button class="modal-close" id="close-details-modal">&times;</button>
                    </div>
                    <div class="details-body" style="padding: 1rem 0;">
                        <img id="details-image" src="${image}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <h3 id="details-title" style="font-size: 1.4rem; color: #fff;">${title}</h3>
                            <span id="details-price" style="font-size: 1.4rem; color: var(--color-cta); font-weight: bold;">${price}</span>
                        </div>
                        <p id="details-seller" style="font-size: 0.9rem; color: #888; margin-bottom: 1.5rem;">Sold by @${seller}</p>
                        
                        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--color-cta);">
                            <h4 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; opacity: 0.6;">Description</h4>
                            <p id="details-description" style="line-height: 1.6; font-size: 0.95rem; color: rgba(255,255,255,0.8);"></p>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding-top: 1rem; display: flex; gap: 10px;">
                        <button class="btn btn-primary btn-full" onclick="addToCartFromRebirth('${title.replace(/'/g, "\\'")}', '${price}', '${image}')">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        detailsModal = document.getElementById('details-modal');

        document.getElementById('close-details-modal').onclick = () => detailsModal.classList.remove('active');
        detailsModal.onclick = (e) => { if (e.target === detailsModal) detailsModal.classList.remove('active'); };
    } else {
        // Update existing
        document.getElementById('details-image').src = image;
        document.getElementById('details-title').textContent = title;
        document.getElementById('details-price').textContent = price;
        document.getElementById('details-seller').textContent = `Sold by @${seller}`;
    }

    // Description can have HTML (<br>), so use innerHTML
    document.getElementById('details-description').innerHTML = description;
    detailsModal.classList.add('active');
}


// ===================================
// IMAGE VIEWER WITH ZOOM & ROTATION
// ===================================
function initializeImageViewer() {
    // Add click handlers to all product images
    const productImages = document.querySelectorAll('.product-image');
    productImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            openImageViewer(img);
        });
    });
}

function openImageViewer(imageElement) {
    // Get product information
    const productCard = imageElement.closest('.product-card');
    const productName = productCard.querySelector('.product-name').textContent;
    const productPrice = productCard.querySelector('.product-price').textContent;
    const imageSrc = imageElement.src;

    // Reset zoom and rotation
    currentZoom = 1;
    currentRotation = 0;

    // Create or get viewer modal
    let viewerModal = document.getElementById('image-viewer-modal');

    if (!viewerModal) {
        const modalHTML = `
            <div class="modal image-viewer-modal" id="image-viewer-modal">
                <div class="image-viewer-content">
                    <div class="viewer-header">
                        <div class="viewer-product-info">
                            <h3 id="viewer-product-name">${productName}</h3>
                            <p id="viewer-product-price">${productPrice}</p>
                        </div>
                        <button class="modal-close" id="close-viewer-modal">&times;</button>
                    </div>
                    
                    <div class="viewer-image-container">
                        <img src="${imageSrc}" alt="${productName}" id="viewer-image" class="viewer-image">
                    </div>
                    
                    <div class="viewer-controls">
                        <div class="zoom-controls">
                            <button class="control-btn" id="zoom-out" title="Zoom Out">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <button class="control-btn" id="zoom-reset" title="Reset Zoom">
                                <i class="fas fa-compress"></i>
                            </button>
                            <button class="control-btn" id="zoom-in" title="Zoom In">
                                <i class="fas fa-search-plus"></i>
                            </button>
                        </div>
                        
                        <div class="wishlist-controls">
                            <button class="control-btn" id="wishlist-btn" title="Add to Wishlist">
                                <i class="far fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        viewerModal = document.getElementById('image-viewer-modal');

        // Setup event listeners
        setupImageViewerControls();
    } else {
        // Update existing modal with new image
        document.getElementById('viewer-product-name').textContent = productName;
        document.getElementById('viewer-product-price').textContent = productPrice;
        document.getElementById('viewer-image').src = imageSrc;
        document.getElementById('viewer-image').alt = productName;
    }

    // Show modal
    viewerModal.classList.add('active');

    // Change background to light cyan
    document.body.classList.add('image-viewer-active');

    // Reset image transform
    updateImageTransform();
}

function setupImageViewerControls() {
    const viewerModal = document.getElementById('image-viewer-modal');
    const viewerImage = document.getElementById('viewer-image');

    // Close button
    document.getElementById('close-viewer-modal').addEventListener('click', () => {
        viewerModal.classList.remove('active');
        document.body.classList.remove('image-viewer-active');
    });

    // Close on background click
    viewerModal.addEventListener('click', (e) => {
        if (e.target === viewerModal) {
            viewerModal.classList.remove('active');
            document.body.classList.remove('image-viewer-active');
        }
    });

    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        currentZoom = Math.min(currentZoom + 0.25, 3);
        updateImageTransform();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        currentZoom = Math.max(currentZoom - 0.25, 0.5);
        updateImageTransform();
    });

    document.getElementById('zoom-reset').addEventListener('click', () => {
        currentZoom = 1;
        updateImageTransform();
    });

    // Wishlist Toggle
    document.getElementById('wishlist-btn').addEventListener('click', () => {
        const productName = document.getElementById('viewer-product-name').textContent;
        toggleWishlist(productName);
    });
    // Mouse wheel zoom
    viewerImage.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            currentZoom = Math.min(currentZoom + 0.1, 3);
        } else {
            currentZoom = Math.max(currentZoom - 0.1, 0.5);
        }
        updateImageTransform();
    });
}

function toggleWishlist(productName) {
    const btn = document.getElementById('wishlist-btn');
    const icon = btn.querySelector('i');

    // Simple toggle logic (visual only for now, can be expanded to storage)
    if (icon.classList.contains('far')) {
        // Add to wishlist
        icon.classList.remove('far');
        icon.classList.add('fas');
        btn.classList.add('active'); // CSS can style this red
        btn.style.color = 'red';
        alert(`${productName} added to wishlist!`);
    } else {
        // Remove from wishlist
        icon.classList.remove('fas');
        icon.classList.add('far');
        btn.classList.remove('active');
        btn.style.color = '';
        alert(`${productName} removed from wishlist.`);
    }
}

function updateImageTransform() {
    const viewerImage = document.getElementById('viewer-image');
    viewerImage.style.transform = `scale(${currentZoom})`;
}



// ===================================
// SECTION NAVIGATION (Home, Buy, Sell, Profile)
// ===================================
function initializeNavigation() {
    // Add click handlers to navigation links with data-section attribute
    const navLinks = document.querySelectorAll('.nav-link[data-section], .mobile-nav-link[data-section], .mobile-nav-icon[data-section]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = link.getAttribute('data-section');
            navigateToSection(sectionName);
        });
    });
}

// Global function to navigate between sections
function navigateToSection(sectionName) {
    // Hide all sections
    const allSections = document.querySelectorAll('.content-section');
    allSections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }

    // Update active state in navigation
    const allNavLinks = document.querySelectorAll('.nav-link[data-section]');
    allNavLinks.forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Reset 'Buy' section to show only tabs (placeholder state)
    if (sectionName === 'buy') {
        const categoryTabs = document.querySelectorAll('.category-tab');
        const allCategories = document.querySelectorAll('.category-content');
        const placeholder = document.getElementById('category-placeholder');

        categoryTabs.forEach(t => t.classList.remove('active'));
        allCategories.forEach(c => {
            c.style.display = 'none';
            c.classList.remove('active');
        });

        if (placeholder) placeholder.style.display = 'block';
    }

    // Load Rebirth items if navigating to Rebirth section
    if (sectionName === 'rebirth') {
        const rebirthMarket = document.getElementById('rebirth-marketplace');
        if (rebirthMarket) rebirthMarket.style.display = 'block';
        loadRebirthItems();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make navigateToSection globally accessible
window.navigateToSection = navigateToSection;

// ===================================
// HEADER MINI-INTERACTIONS (Help, Contact)
// ===================================
function initializeHeaderInteractions() {
    const helpLinks = [document.getElementById('help-link'), document.getElementById('mobile-help-link')];
    const contactLinks = [document.getElementById('contact-link'), document.getElementById('mobile-contact-link')];
    const helpModal = document.getElementById('help-modal');
    const contactModal = document.getElementById('contact-modal');
    const closeHelp = document.getElementById('close-help');
    const closeContact = document.getElementById('close-contact');

    // Help Links
    helpLinks.forEach(link => {
        if (link && helpModal) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                helpModal.classList.add('active');
            });
        }
    });

    // Contact Links
    contactLinks.forEach(link => {
        if (link && contactModal) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                contactModal.classList.add('active');
            });
        }
    });

    [closeHelp, closeContact].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        }
    });

    // Close modals on outside click
    [helpModal, contactModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });
}
// Handle contact form submission
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Sending...';
        btn.disabled = true;

        setTimeout(() => {
            alert('Thank you for your message. CHASED support will contact you shortly.');
            btn.textContent = originalText;
            btn.disabled = false;
            contactForm.reset();
            contactModal.classList.remove('active');
        }, 1000);
    });
}

// ===================================
// HEADER SEARCH TOGGLE
// ===================================
function initializeHeaderSearch() {
    // Desktop Search
    const searchContainer = document.getElementById('header-search');
    const searchToggle = document.getElementById('search-toggle');
    const searchInput = document.getElementById('search-input');

    // Mobile Search
    const mobileSearchContainer = document.getElementById('mobile-header-search');
    const mobileSearchToggle = document.getElementById('mobile-search-toggle');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchClose = document.getElementById('mobile-search-close');

    function handleSearchEnter(e, input, container) {
        if (e.key === 'Enter') {
            const query = input.value.toLowerCase().trim();
            let categoryToSelect = '';

            const keywords = {
                pants: ['pants', 'trousers', 'jeans', 'leggings', 'bottoms', 'slacks'],
                jewelry: ['jewelry', 'jewelary', 'accessory', 'necklace', 'ring', 'earring', 'bracelet', 'gem', 'gold', 'silver'],
                tops: ['tops', 'top', 'shirt', 'blouse', 'sweater', 'tshirt', 'tee', 'hoodie', 'jacket', 'coat'],
                dresses: ['dresses', 'dress', 'gown', 'skirt', 'maxi', 'mini', 'midi'],
                footwear: ['footwear', 'shoes', 'shoe', 'boots', 'sneakers', 'heels', 'sandals', 'flats']
            };

            for (const [category, synonyms] of Object.entries(keywords)) {
                if (synonyms.some(syn => query.includes(syn))) {
                    categoryToSelect = category;
                    break;
                }
            }

            if (categoryToSelect) {
                navigateToSection('buy');
                const tab = document.querySelector(`.category-tab[data-category="${categoryToSelect}"]`);
                if (tab) tab.click();
                input.value = '';
                container.classList.remove('expanded');
            }
        }
    }

    // Desktop Event Listeners
    if (searchToggle && searchContainer && searchInput) {
        searchToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            searchContainer.classList.toggle('expanded');
            if (searchContainer.classList.contains('expanded')) searchInput.focus();
        });

        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) searchContainer.classList.remove('expanded');
        });

        searchInput.addEventListener('click', (e) => e.stopPropagation());
        searchInput.addEventListener('keydown', (e) => handleSearchEnter(e, searchInput, searchContainer));
    }

    // Mobile Event Listeners
    if (mobileSearchToggle && mobileSearchContainer && mobileSearchInput) {
        mobileSearchToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileSearchContainer.classList.add('expanded');
            mobileSearchInput.focus();
        });

        if (mobileSearchClose) {
            mobileSearchClose.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileSearchContainer.classList.remove('expanded');
            });
        }

        mobileSearchInput.addEventListener('click', (e) => e.stopPropagation());
        mobileSearchInput.addEventListener('keydown', (e) => handleSearchEnter(e, mobileSearchInput, mobileSearchContainer));

        // Re-use desktop click behavior to close mobile search if needed, 
        // but mobile search has a dedicated close button too.
        document.addEventListener('click', (e) => {
            if (!mobileSearchContainer.contains(e.target)) {
                mobileSearchContainer.classList.remove('expanded');
            }
        });
    }
}

// ===================================
// PROFILE FORMS (Login/Create Account)
// ===================================
function initializeProfileForms() {
    console.log('CHASED: Initializing profile forms...');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');

    const loginForm = document.getElementById('login-form-container');
    const signupForm = document.getElementById('signup-form-container');

    // Password Toggle Logic
    const togglePassword = document.getElementById('toggle-login-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const passwordInput = document.getElementById('login-password');
            // Toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle the eye / eye slash icon
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (loginTab && signupTab && loginForm && signupForm) {
        // Tab switching
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        });

        signupTab.addEventListener('click', () => {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.style.display = 'block';
            loginForm.style.display = 'none';
        });
    }

    // Handle login form submission (Direct Button Click)
    const loginBtn = document.querySelector('#profile-login-form button[type="submit"]');
    if (loginBtn) {
        // Remove type="submit" to prevent form default handling quirks
        loginBtn.type = "button";

        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('CHASED: Login CLICK triggered');

            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');

            if (!emailInput.value || !passwordInput.value) {
                alert('Please fill in all fields (Manual Check)');
                return;
            }

            if (!supabaseClient) {
                alert('Critical Error: Supabase client not initialized!');
                return;
            }

            loginBtn.textContent = 'Logging in...';
            loginBtn.disabled = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: emailInput.value,
                password: passwordInput.value,
            });

            if (data.user) {
                console.log('CHASED: Login successful', data.user);

                // SAVE RECENT USER for "Welcome Back" feature
                const userData = {
                    email: data.user.email,
                    name: data.user.user_metadata.full_name || data.user.email.split('@')[0],
                    initials: (data.user.user_metadata.full_name || data.user.email).substring(0, 2).toUpperCase()
                };
                localStorage.setItem('chased_recent_user', JSON.stringify(userData));

                alert(`Success: Welcome back, ${data.user.email}!`);
                updateUserUI(data.user);
            } else {
                console.error('CHASED: Login error', error);
                alert(`Login failed: ${error.message}`);
                loginBtn.textContent = 'Login';
                loginBtn.disabled = false;
            }
        });
    } else {
        console.error('CHASED: Login Button NOT found');
    }

    // Handle signup form validation & submission
    const signupBtn = document.querySelector('#profile-signup-form button[type="submit"]');

    // Show Password Toggle Logic
    // Show Password Toggle Logic (Login & Signup)
    const toggleSignupPass = document.getElementById('toggle-signup-password');
    const toggleSignupConfirm = document.getElementById('toggle-signup-confirm');

    function setupPasswordToggle(toggleId, inputId) {
        const toggleBtn = document.getElementById(toggleId);
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                const inputInfo = document.getElementById(inputId);
                const type = inputInfo.getAttribute('type') === 'password' ? 'text' : 'password';
                inputInfo.setAttribute('type', type);

                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            });
        }
    }

    // Setup toggles
    setupPasswordToggle('toggle-signup-password', 'signup-password');
    setupPasswordToggle('toggle-signup-confirm', 'signup-confirm');

    if (signupBtn) {
        signupBtn.type = "button";

        signupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('CHASED: Signup CLICK triggered');

            const nameInput = document.getElementById('signup-name');
            const emailInput = document.getElementById('signup-email');
            const passwordInput = document.getElementById('signup-password');
            const confirmInput = document.getElementById('signup-confirm');
            const termsParams = document.getElementById('terms-agree');

            // 1. Detailed Validation
            if (!nameInput.value.trim()) {
                alert('Instruction: Please enter your full name to proceed.');
                nameInput.focus();
                return;
            }
            if (!emailInput.value.trim()) {
                alert('Instruction: An email address is required to create your account.');
                emailInput.focus();
                return;
            }
            if (!passwordInput.value) {
                alert('Instruction: Please create a password to secure your account.');
                passwordInput.focus();
                return;
            }
            if (!confirmInput.value) {
                alert('Instruction: Please confirm your password by typing it again.');
                confirmInput.focus();
                return;
            }
            if (passwordInput.value !== confirmInput.value) {
                alert('Error: The passwords you entered do not match. Please try again.');
                return;
            }
            if (termsParams && !termsParams.checked) {
                alert('Instruction: You must agree to the Terms of Service to continue.');
                return;
            }

            alert('Details looks good! Creating your account...');

            signupBtn.textContent = 'Creating account...';
            signupBtn.disabled = true;

            try {
                console.log('CHASED: Calling Supabase signUp...');
                const redirectUrl = window.location.origin;

                const { data, error } = await supabaseClient.auth.signUp({
                    email: emailInput.value,
                    password: passwordInput.value,
                    options: {
                        data: { full_name: nameInput.value },
                        emailRedirectTo: redirectUrl
                    }
                });
                if (error) throw error;

                console.log('CHASED: Supabase response:', data);

                if (data.session) {
                    alert('Success: Account created and logged in!');
                    updateUserUI(data.user);
                } else if (data.user) {
                    alert(`Success! Please check your email (${emailInput.value}) for the confirmation link to complete setup.`);
                }

                // Clear form
                nameInput.value = '';
                emailInput.value = '';
                passwordInput.value = '';
                confirmInput.value = '';

            } catch (err) {
                console.error('CHASED: Signup error:', err);
                alert(`Signup failed: ${err.message}`);
            } finally {
                signupBtn.textContent = 'Create Account';
                signupBtn.disabled = false;
            }
        });
    } else {
        console.error('CHASED: Signup Button NOT found');
    }
}

// Add helper to update UI with user info
function updateUserUI(user) {
    console.log('CHASED: Updating User UI for:', user);
    const profileContainer = document.querySelector('.profile-container');

    if (profileContainer) {
        // Add wide class for dashboard view
        profileContainer.classList.add('wide-profile');

        const userName = user.user_metadata.full_name || user.email.split('@')[0];

        profileContainer.innerHTML = `
            <div class="header" style="text-align: left; padding: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
                    <div>
                        <h1 class="header-title" style="font-size: 2.5rem;">Welcome back, ${userName}</h1>
                        <p class="header-subtitle">Your personal fashion command center</p>
                    </div>
                    <button class="btn btn-secondary" onclick="handleLogout()" style="padding: 0.5rem 1.5rem;">Logout</button>
                </div>
                
                <div class="welcome-video-container" style="border-color: var(--color-cta); overflow: hidden; border-radius: 12px; position: relative; background-color: #1a1a1a; height: 250px;">
                    <img src="assets/welcome_header.png" alt="Welcome to Chased" class="welcome-video" id="profile-welcome-video" style="width: 100%; height: 100%; object-fit: cover; display: block; margin: 0; padding: 0;">
                    <div style="position: absolute; bottom: 20px; left: 20px; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 8px; backdrop-filter: blur(5px); border-left: 3px solid var(--color-cta);">
                        <p style="margin: 0; font-size: 0.9rem;">TRENDING NOW</p>
                        <h3 style="margin: 0; color: #fff;">Summer Collection 2026</h3>
                    </div>
                </div>
            </div>
            </div>

            <div class="dashboard-grid">
                <!-- 1. Activity & History -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <span class="dashboard-card-title"><i class="fas fa-history"></i> Recent Activity</span>
                        <a href="#" onclick="clearActivity(event)" style="color: var(--color-text-body); font-size: 0.8rem;">Clear History</a>
                    </div>
                    <ul class="dashboard-list" id="recent-activity-list">
                        <!-- Dynamic Content -->
                        <li class="dashboard-item" style="justify-content: center; opacity: 0.6;">
                            <p>No recent activity tracked.</p>
                        </li>
                    </ul>
                </div>

                <!-- 2. Orders & Tracking -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <span class="dashboard-card-title"><i class="fas fa-box-open"></i> My Orders</span>
                        <span style="background: var(--color-cta); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">1 Active</span>
                    </div>
                    <ul class="dashboard-list">
                        <li class="dashboard-item">
                            <div class="item-details">
                                <div style="display: flex; justify-content: space-between;">
                                    <p class="item-name">Order #CH-8821</p>
                                    <span class="status-badge status-shipped">Shipped</span>
                                </div>
                                <p class="item-meta">Est. Delivery: Tomorrow, 2:00 PM</p>
                                <div style="margin-top: 5px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                                    <div style="width: 75%; height: 100%; background: var(--color-cta);"></div>
                                </div>
                                <p class="item-meta" style="margin-top: 5px; font-size: 0.75rem;">Shipping to: 123 Fashion Ave, London</p>
                            </div>
                        </li>
                        <li class="dashboard-item">
                            <div class="item-details">
                                <div style="display: flex; justify-content: space-between;">
                                    <p class="item-name">Order #CH-8100</p>
                                    <span class="status-badge status-delivered">Delivered</span>
                                </div>
                                <p class="item-meta">Delivered on Jan 10, 2026</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <!-- 3. Seller Dashboard -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <span class="dashboard-card-title"><i class="fas fa-chart-line"></i> Rebirth Sales</span>
                        <button class="btn btn-sm" onclick="showSellModal()" style="padding: 0.2rem 0.8rem; font-size: 0.8rem;">+ List Item</button>
                    </div>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <div style="flex: 1; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; text-align: center;">
                            <h4 style="font-size: 1.5rem; color: var(--color-cta);">Â£1,250</h4>
                            <p style="font-size: 0.7rem; opacity: 0.7;">Total Sales</p>
                        </div>
                         <div style="flex: 1; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; text-align: center;">
                            <h4 style="font-size: 1.5rem; color: #fff;">4</h4>
                            <p style="font-size: 0.7rem; opacity: 0.7;">Active Listings</p>
                        </div>
                    </div>
                    <ul class="dashboard-list">
                         <li class="dashboard-item">
                            <img src="https://images.unsplash.com/photo-1583743814966-8933f1b0ee2a?auto=format&fit=crop&q=80&w=100" class="item-image">
                            <div class="item-details">
                                <p class="item-name">Vintage Chanel Bag</p>
                                <p class="item-meta">Listed: 5 days ago â€¢ Â£850</p>
                            </div>
                             <span class="status-badge status-processing">Active</span>
                        </li>
                        <li class="dashboard-item">
                            <img src="https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&q=80&w=100" class="item-image">
                            <div class="item-details">
                                <p class="item-name">Denim Jacket</p>
                                <p class="item-meta">Sold to: Sarah K.</p>
                            </div>
                             <span class="status-badge status-delivered">Sold</span>
                        </li>
                    </ul>
                </div>

                <!-- 4. Profile Settings -->
                <div class="dashboard-card full-width" style="grid-column: 1 / -1;">
                    <div class="dashboard-card-header">
                        <span class="dashboard-card-title"><i class="fas fa-user-cog"></i> Account Settings</span>
                        <button class="btn btn-primary" style="padding: 5px 15px; font-size: 0.8rem;">Save Changes</button>
                    </div>
                    <form class="dashboard-form-grid">
                        <div>
                            <label class="dashboard-label">First Name</label>
                            <input type="text" class="dashboard-input" value="${userName.split(' ')[0] || ''}">
                        </div>
                        <div>
                            <label class="dashboard-label">Last Name</label>
                            <input type="text" class="dashboard-input" value="${userName.split(' ')[1] || ''}">
                        </div>
                        
                         <div>
                            <label class="dashboard-label">Email Address</label>
                            <input type="email" class="dashboard-input" value="${user.email}" disabled style="opacity: 0.5; cursor: not-allowed;">
                        </div>
                        <div>
                            <label class="dashboard-label">Phone Number</label>
                            <input type="tel" class="dashboard-input" placeholder="+44 7700 900000">
                        </div>

                        <div>
                            <label class="dashboard-label">Date of Birth</label>
                            <input type="date" class="dashboard-input">
                        </div>
                        <div>
                            <label class="dashboard-label">Gender</label>
                            <select class="dashboard-input">
                                <option>Select Gender</option>
                                <option>Female</option>
                                <option>Male</option>
                                <option>Non-binary</option>
                                <option>Prefer not to say</option>
                            </select>
                        </div>

                         <div class="full-width">
                            <label class="dashboard-label">Shipping Address</label>
                            <input type="text" class="dashboard-input" placeholder="House number, Street name">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px;">
                                <input type="text" class="dashboard-input" placeholder="City">
                                <input type="text" class="dashboard-input" placeholder="State/County">
                                <input type="text" class="dashboard-input" placeholder="Postcode">
                            </div>
                        </div>

                        <div class="full-width">
                            <label class="dashboard-label">Payment Methods</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border: 1px solid var(--color-cta);">
                                    <i class="fab fa-cc-visa" style="font-size: 1.5rem;"></i>
                                    <span>â€¢â€¢â€¢â€¢ 4242</span>
                                </div>
                                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">+ Add New Card</button>
                            </div>
                        </div>
                    </form>
                </div>
                </div>
            </div>
        `;

        // Provide immediate feedback by rendering activity list
        setTimeout(() => {
            renderRecentActivity();
        }, 100);
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    location.reload(); // Quickest way to reset UI
}

window.handleLogout = handleLogout;
window.showSellMenu = showSellMenu;
window.openListingForm = openListingForm;
window.showSellModal = openListingForm; // Alias for dashboard button

// ===================================
// CHECKOUT SYSTEM
// ===================================

function openCheckout() {
    // Close cart first
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) cartModal.classList.remove('active');

    // Calculate totals
    let total = 0;
    cart.forEach(item => {
        const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        total += price * item.quantity;
    });

    document.getElementById('checkout-subtotal').textContent = `£${total.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `£${total.toFixed(2)}`;

    // Open checkout modal
    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) {
        checkoutModal.classList.add('active');

        // Setup Close Handler
        const closeBtn = document.getElementById('close-checkout');
        if (closeBtn) {
            closeBtn.onclick = () => checkoutModal.classList.remove('active');
        }

        // Setup Submit Handler
        const form = document.getElementById('checkout-form');
        form.onsubmit = handlePaymentProcess;
    }
}

async function handlePaymentProcess(e) {
    e.preventDefault();

    const payBtn = document.getElementById('pay-button');
    const originalText = payBtn.textContent;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    payBtn.disabled = true;

    // Simulate Network Delay (2 seconds) to feel "real"
    await new Promise(r => setTimeout(r, 2000));

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // 1. Create Order
        let totalAmount = 0;
        cart.forEach(item => {
            totalAmount += parseFloat(item.price.replace(/[^0-9.]/g, '')) * item.quantity;
        });

        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .insert([{
                user_id: user.id,
                total_amount: totalAmount,
                status: 'paid',
                shipping_address: {
                    name: document.getElementById('shipping-name').value,
                    address: document.getElementById('shipping-address').value,
                    city: document.getElementById('shipping-city').value,
                    zip: document.getElementById('shipping-zip').value
                }
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Create Order Items & Update Rebirth Status
        for (const item of cart) {
            const priceVal = parseFloat(item.price.replace(/[^0-9.]/g, ''));

            // Insert Order Item
            await supabaseClient
                .from('order_items')
                .insert([{
                    order_id: order.id,
                    product_name: item.name,
                    price: priceVal,
                    quantity: item.quantity,
                    rebirth_item_id: item.rebirthId || null,
                    image_url: item.image
                }]);

            // If it's a specific Rebirth item, mark as SOLD
            if (item.rebirthId) {
                const { error: rpcError } = await supabaseClient
                    .rpc('mark_item_sold', { item_id: item.rebirthId });

                if (rpcError) console.error("Error marking item sold:", rpcError);
            }

            // Track "Purchased" activity (real)
            trackActivity('Purchased', item.name, item.image, item.price);
        }

        // Success!
        alert('Order Placed Successfully! Thank you for your purchase.');
        cart = [];
        updateCartCount();
        document.getElementById('cart-items-container').innerHTML = '<p class="cart-empty" style="text-align: center; color: #666; padding: 20px;">Your cart is empty.</p>';
        document.getElementById('cart-total-amount').textContent = '£0';
        document.getElementById('checkout-modal').classList.remove('active');

        // Refresh Feed to remove sold items
        if (window.loadRebirthItems) window.loadRebirthItems();

    } catch (err) {
        console.error('Payment Error:', err);
        alert('Payment processing failed: ' + err.message);
    } finally {
        payBtn.textContent = originalText;
        payBtn.disabled = false;
    }
}

// Make globally available
window.openCheckout = openCheckout;

// Bind Checkout Form Globally
document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handlePaymentProcess);
    }
});

// ===================================
// PRODUCT CATEGORIES (Dresses, Footwear, Tops, Pants)
// ===================================


// ===================================
// MY LISTINGS (Edit/Delete)
// ===================================
async function openMyListings() {
    // Close sell menu
    const sellModal = document.getElementById('sell-modal');
    if (sellModal) sellModal.classList.remove('active');

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Please login to view your listings.");
        return;
    }

    let myModal = document.getElementById('my-listings-modal');
    if (!myModal) {
        const modalHTML = `
            <div class="modal" id="my-listings-modal">
                <div class="modal-content" style="max-width: 900px; width: 90%; background: #1a1a1a; border: 1px solid #333;">
                    <div class="modal-header" style="border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 class="modal-title" style="margin: 0;">My Listings</h2>
                        <button class="modal-close" id="close-my-listings" style="font-size: 1.5rem;">&times;</button>
                    </div>
                    <div id="my-listings-grid" class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; max-height: 60vh; overflow-y: auto; padding-right: 5px;">
                        <!-- Items injected here -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        myModal = document.getElementById('my-listings-modal');

        document.getElementById('close-my-listings').addEventListener('click', () => {
            myModal.classList.remove('active');
        });
    }

    // Load items
    const grid = document.getElementById('my-listings-grid');
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">Loading your items...</p>';
    myModal.classList.add('active');

    const { data: items, error } = await supabaseClient
        .from('rebirth_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = '<p style="color:red; grid-column: 1/-1; text-align: center;">Error loading listings.</p>';
        return;
    }

    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">You haven\'t listed anything yet.</p>';
        return;
    }

    grid.innerHTML = items.map(item => `
        <div class="product-card" style="display: flex; flex-direction: column; background: #222; border: 1px solid #333; border-radius: 8px; overflow: hidden; transition: transform 0.2s;">
            <div class="product-image-container" style="height: 200px; position: relative;">
                <img src="${item.image_url}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">
                <span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase;">${item.category}</span>
            </div>
            <div class="product-info" style="padding: 15px; flex: 1; display: flex; flex-direction: column;">
                <h3 class="product-name" style="margin: 0 0 5px 0; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</h3>
                <span class="product-price" style="font-size: 1.2rem; font-weight: bold; color: var(--color-cta);">${item.price}</span>
            </div>
            <div class="product-actions" style="padding: 15px; padding-top: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="btn btn-secondary" style="width: 100%; padding: 8px;" onclick="window.handleEditPrice(${item.id}, '${item.price}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-primary" style="width: 100%; padding: 8px; background: #dc3545; border-color: #dc3545;" onclick="window.handleDeleteItem(${item.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function handleDeleteItem(id) {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    const { error } = await supabaseClient
        .from('rebirth_items')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error deleting: " + error.message);
    } else {
        if (error) throw error;

        // Track Activity locally
        trackActivity('Sold', itemName, 'assets/dashboard/welcome_header.png', `£${price}`); // Using placeholder image for now

        alert('Item listed successfully!');
        e.target.reset();
        loadRebirthItems(); // Refresh the gridn feed in background
    }
}

async function handleEditPrice(id, oldPrice) {
    // fast cleaning of currency symbol if present
    const cleanPrice = oldPrice.replace('£', '').trim();
    const newPrice = prompt("Enter new price (£):", cleanPrice);

    if (!newPrice || newPrice === cleanPrice) return;

    const formattedPrice = `£${newPrice}`;

    const { error } = await supabaseClient
        .from('rebirth_items')
        .update({ price: formattedPrice })
        .eq('id', id);

    if (error) {
        alert("Error updating: " + error.message);
    } else {
        openMyListings(); // Refresh list
        loadRebirthItems(); // Refresh main feed
    }
}

// Expose to window
window.openMyListings = openMyListings;
window.handleDeleteItem = handleDeleteItem;
window.handleEditPrice = handleEditPrice;

// ===================================
// PRODUCT CATEGORIES (Standard)
// ===================================
function initializeProductCategories() {
    const categoryTabs = document.querySelectorAll('.category-tab');
    const placeholder = document.getElementById('category-placeholder');
    const promo = document.getElementById('rebirth-promo');
    const rebirthMarket = document.getElementById('rebirth-marketplace');

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            console.log('CHASED: Category tab clicked', tab.id);
            const categoryName = tab.getAttribute('data-category');

            // 1. Hide Placeholder & Promo
            if (placeholder) placeholder.style.display = 'none';
            if (promo) promo.style.display = 'none';

            // 2. Hide Rebirth Marketplace (Critical Fix)
            if (rebirthMarket) rebirthMarket.style.display = 'none';

            // 3. Update active tab styling
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 4. Show selected category content
            const allCategories = document.querySelectorAll('.category-content');
            allCategories.forEach(cat => {
                cat.style.display = 'none';
                cat.classList.remove('active');
            });

            const selectedCategory = document.getElementById(`${categoryName}-category`);
            if (selectedCategory) {
                selectedCategory.style.display = 'block';
                // Small timeout to allow display:block to render before opacity transition if any
                setTimeout(() => selectedCategory.classList.add('active'), 10);
            } else {
                console.error(`CHASED: Category content not found for #${categoryName}-category`);
            }
        });
    });
}

// ===================================
// SHOP ENTRY ANIMATION
// ===================================
function enterShop() {
    console.log('CHASED: Entering shop...');
    const hero = document.getElementById('buy-landing-hero');
    const categories = document.querySelector('.product-categories');
    const promo = document.getElementById('rebirth-promo');
    const placeholder = document.getElementById('category-placeholder');

    if (hero) hero.style.display = 'none';
    if (categories) categories.style.display = 'flex';
    if (promo) promo.style.display = 'block'; // Keep promo visible
    if (placeholder) placeholder.style.display = 'block';

    // Scroll to top of categories
    if (categories) categories.scrollIntoView({ behavior: 'smooth' });
}

// Expose to window


// ===================================
// SECTION NAVIGATION
// ===================================


// --- Recent Activity Tracking ---

function trackActivity(type, itemName, itemImage, itemPrice) {
    const activity = {
        type: type,
        name: itemName,
        image: itemImage,
        price: itemPrice,
        timestamp: Date.now()
    };

    let history = JSON.parse(localStorage.getItem('user_activity') || '[]');
    history.unshift(activity); // Add to beginning

    // Limit to last 20 items
    if (history.length > 20) history.pop();

    localStorage.setItem('user_activity', JSON.stringify(history));

    // If dashboard is currently visible, re-render
    const list = document.getElementById('recent-activity-list');
    if (list) renderRecentActivity();
}

function renderRecentActivity() {
    const list = document.getElementById('recent-activity-list');
    if (!list) return;

    const history = JSON.parse(localStorage.getItem('user_activity') || '[]');

    if (history.length === 0) {
        list.innerHTML = `
            <li class="dashboard-item" style="justify-content: center; opacity: 0.6;">
                <p>No recent activity tracked.</p>
            </li>
        `;
        return;
    }

    list.innerHTML = history.map(item => {
        const timeString = new Date(item.timestamp).toLocaleDateString() === new Date().toLocaleDateString()
            ? 'Today'
            : new Date(item.timestamp).toLocaleDateString();

        let iconClass = 'fa-eye';
        if (item.type === 'Purchased') iconClass = 'fa-shopping-bag';
        if (item.type === 'Sold') iconClass = 'fa-tag';

        // Use a fallback image if none provided or error
        const img = item.image || 'https://via.placeholder.com/50';

        return `
            <li class="dashboard-item">
                <img src="${img}" onerror="this.src='https://via.placeholder.com/50'" class="item-image" style="object-fit:cover;">
                <div class="item-details">
                    <p class="item-name"><i class="fas ${iconClass}" style="margin-right:5px; opacity:0.7;"></i> ${item.type}: ${item.name}</p>
                    <p class="item-meta">${timeString} • ${item.price || ''}</p>
                </div>
            </li>
        `;
    }).join('');
}

function clearActivity(e) {
    if (e) e.preventDefault();
    if (confirm('Are you sure you want to clear your activity history?')) {
        localStorage.removeItem('user_activity');
        renderRecentActivity();
    }
}
