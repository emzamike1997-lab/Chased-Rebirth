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
                await supabaseClient
                    .from('rebirth_items')
                    .update({ status: 'sold' })
                    .eq('id', item.rebirthId);
            }

            // Track "Purchased" activity (real)
            trackActivity('Purchased', item.name, item.image, item.price);
        }

        // Success!
        alert('Order Placed Successfully! Thank you for your purchase.');
        cart = [];
        updateCartCount();
        document.getElementById('cart-items').innerHTML = ''; // Clear cart UI
        document.getElementById('checkout-modal').classList.remove('active');

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
