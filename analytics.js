// ===================================
// ANALYTICS DASHBOARD
// ===================================

let salesCharts = {}; // Store chart instances

async function openAnalyticsDashboard() {
    // Navigate to Analytics Section
    navigateToSection('analytics'); // Ensure this hides others

    // Manually force display if navigateToSection isn't updated for 'analytics' (it might default to 'home')
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const section = document.getElementById('analytics-section');
    section.style.display = 'block';
    setTimeout(() => section.classList.add('active'), 10);

    // Fetch and Render Data
    await loadAnalyticsData();
}

async function loadAnalyticsData() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return alert("Please login.");

        // 1. Fetch Listings (Inventory)
        const { data: items } = await supabaseClient
            .from('rebirth_items')
            .select('*')
            .eq('user_id', user.id);

        // 2. Fetch Sales (Orders) - Assuming sales are tracked via 'rebirth_items' status='sold' OR we could query 'order_items' if we linked them
        // For accurate revenue, let's use the 'status' we updated.
        const soldItems = items.filter(i => i.status === 'sold');
        const activeItems = items.filter(i => i.status !== 'sold');

        // Calculate Revenue
        let totalRevenue = 0;
        soldItems.forEach(item => {
            const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
            totalRevenue += price;
        });

        // Update Summary Cards
        document.getElementById('analytics-revenue').textContent = `£${totalRevenue.toFixed(2)}`;
        document.getElementById('analytics-sold-count').textContent = soldItems.length;
        document.getElementById('analytics-active-count').textContent = activeItems.length;

        // 3. Prepare Chart Data

        // A. Revenue Growth (Simulate time distribution based on 'created_at' for now as sold_at isn't tracked yet, or just aggregate by category if easier)
        // Let's use Category distribution for Revenue
        const categories = {};
        soldItems.forEach(item => {
            const cat = item.category || 'Other';
            if (!categories[cat]) categories[cat] = 0;
            const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
            categories[cat] += price;
        });

        // B. Listings by Category (Active vs Sold)
        const catStats = {};
        items.forEach(item => {
            const cat = item.category || 'Other';
            if (!catStats[cat]) catStats[cat] = { active: 0, sold: 0 };
            if (item.status === 'sold') catStats[cat].sold++;
            else catStats[cat].active++;
        });

        // C. Engagement (from localStorage)
        const activity = JSON.parse(localStorage.getItem('user_activity') || '[]');
        let views = 0;
        let purchases = 0;
        activity.forEach(a => {
            if (a.type === 'Viewed') views++;
            if (a.type === 'Purchased') purchases++;
        });


        // 4. Render Charts
        renderRevenueChart(categories);
        renderCategoryChart(catStats);
        renderEngagementChart(views, purchases);

    } catch (err) {
        console.error("Analytics Error:", err);
    }
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (salesCharts.revenue) salesCharts.revenue.destroy();

    salesCharts.revenue = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Revenue by Category',
                data: Object.values(data),
                backgroundColor: [
                    '#d4af37', '#e5e5e5', '#333333', '#8b4513', '#556b2f'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#ccc' } }
            }
        }
    });
}

function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (salesCharts.category) salesCharts.category.destroy();

    const labels = Object.keys(data);
    const activeData = labels.map(l => data[l].active);
    const soldData = labels.map(l => data[l].sold);

    salesCharts.category = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Active Listings',
                    data: activeData,
                    backgroundColor: '#333',
                    borderColor: '#555',
                    borderWidth: 1
                },
                {
                    label: 'Items Sold',
                    data: soldData,
                    backgroundColor: '#d4af37',
                    borderColor: '#d4af37',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            },
            plugins: {
                legend: { labels: { color: '#ccc' } }
            }
        }
    });
}

function renderEngagementChart(views, purchases) {
    const ctx = document.getElementById('engagementChart').getContext('2d');
    if (salesCharts.engagement) salesCharts.engagement.destroy();

    salesCharts.engagement = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Views', 'Purchases'],
            datasets: [{
                data: [views, purchases],
                backgroundColor: ['#555', '#d4af37'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#ccc' } }
            }
        }
    });
}

window.openAnalyticsDashboard = openAnalyticsDashboard;
