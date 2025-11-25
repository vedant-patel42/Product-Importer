// API Service - Centralized API calls
const api = {
    // Base API helper function
    async request(endpoint, options = {}) {
        const res = await fetch('/api' + endpoint, options);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        console.log('API Response:', data);
        return data;
    },

    // Upload endpoints
    uploadFile: (formData) => api.request('/upload', { method: 'POST', body: formData }),
    getTaskStatus: (taskId) => api.request(`/tasks/${taskId}`),

    // Product endpoints
    getProducts: (page, search) => api.request(`/products?page=${page}&search=${search}`),
    createProduct: (product) => api.request('/products', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(product)
    }),
    deleteProduct: (id) => api.request(`/products/${id}`, { method: 'DELETE' }),
    bulkDeleteProducts: () => api.request('/products/bulk', { method: 'DELETE' }),

    // Webhook endpoints
    getWebhooks: () => api.request('/webhooks'),
    createWebhook: (webhook) => api.request('/webhooks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(webhook)
    }),
    deleteWebhook: (id) => api.request(`/webhooks/${id}`, { method: 'DELETE' }),
    toggleWebhook: (id) => api.request(`/webhooks/${id}/toggle`, { method: 'PATCH' }),
    updateWebhook: (id, webhook) => api.request(`/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook),
    }),
    testWebhook: async (url) => {
        const res = await fetch(`/api/webhooks/test?url=${encodeURIComponent(url)}`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'} 
        });
        const data = await res.json();
        return {
            ok: res.ok,
            status_code: data.status_code ?? res.status,
            elapsed_ms: data.elapsed_ms ?? 0,
        };
    }
};