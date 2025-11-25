// Products Component - Manages product inventory with CRUD operations
const ProductsComponent = {
    setup() {
        const { ref, onMounted } = Vue;
        
        // Products State
        const products = ref([]);
        const page = ref(1);
        const searchQuery = ref('');
        const showCreateModal = ref(false);
        const newProduct = ref({ sku: '', name: '', description: '' });

        // Product Logic
        const fetchProducts = async () => {
            const res = await api.getProducts(page.value, searchQuery.value);
            console.log("Products response:", res);
            products.value = res.data;
        };

        const createProduct = async () => {
            try {
                await api.createProduct(newProduct.value);
                showCreateModal.value = false;
                newProduct.value = { sku: '', name: '', description: '' };
                fetchProducts();
            } catch(e) { alert('Error creating product'); }
        };

        const deleteProduct = async (id) => {
            if(!confirm('Delete this product?')) return;
            await api.deleteProduct(id);
            fetchProducts();
        };

        const confirmBulkDelete = async () => {
            if (!confirm("Are you sure? This will delete ALL products. This cannot be undone.")) return;
            const res = await api.bulkDeleteProducts();
            alert('Bulk delete started.');
            pollTask(res.task_id); // Reuse polling logic from upload
        };

        const pollTask = (taskId) => {
            const interval = setInterval(async () => {
                const res = await api.getTaskStatus(taskId);
                if (res.state === 'SUCCESS' || res.state === 'FAILURE') {
                    clearInterval(interval);
                    if (res.state === 'SUCCESS') fetchProducts();
                }
            }, 1000);
        };

        // Listen for upload complete events
        onMounted(() => {
            window.addEventListener('upload-complete', fetchProducts);
        });

        return {
            products,
            page,
            searchQuery,
            showCreateModal,
            newProduct,
            fetchProducts,
            createProduct,
            deleteProduct,
            confirmBulkDelete
        };
    },
    template: `
        <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold">Product Inventory</h2>
                <div class="flex gap-2">
                    <input v-model="searchQuery" @keyup.enter="fetchProducts" type="text" placeholder="Search SKU/Name..." class="border rounded px-3 py-2 text-sm">
                    <button @click="showCreateModal = true" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">
                        <i class="fas fa-plus"></i> New
                    </button>
                    <button @click="confirmBulkDelete" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm">
                        <i class="fas fa-trash"></i> Delete All
                    </button>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-100 text-gray-600 text-sm uppercase">
                            <th class="p-3 border-b">ID</th>
                            <th class="p-3 border-b">SKU</th>
                            <th class="p-3 border-b">Name</th>
                            <th class="p-3 border-b">Description</th>
                            <th class="p-3 border-b">Status</th>
                            <th class="p-3 border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm">
                        <tr v-for="p in products" :key="p.id" class="hover:bg-gray-50 border-b">
                            <td class="p-3 text-gray-500">{{ p.id }}</td>
                            <td class="p-3 font-mono font-bold">{{ p.sku }}</td>
                            <td class="p-3">{{ p.name }}</td>
                            <td class="p-3 text-gray-500 truncate max-w-xs">{{ p.description }}</td>
                            <td class="p-3">
                                <span :class="p.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="px-2 py-1 rounded-full text-xs">
                                    {{ p.is_active ? 'Active' : 'Inactive' }}
                                </span>
                            </td>
                            <td class="p-3 text-right space-x-2">
                                <button @click="deleteProduct(p.id)" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="mt-4 flex justify-center space-x-2">
                <button @click="page > 1 && (page--, fetchProducts())" :disabled="page === 1" class="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                <span class="px-3 py-1 border bg-gray-50">{{ page }}</span>
                <button @click="page++, fetchProducts()" class="px-3 py-1 border rounded">Next</button>
            </div>

            <!-- Create Modal -->
            <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div class="bg-white p-6 rounded-lg w-96">
                    <h3 class="font-bold mb-4">New Product</h3>
                    <input v-model="newProduct.sku" placeholder="SKU" class="w-full mb-2 border p-2 rounded">
                    <input v-model="newProduct.name" placeholder="Name" class="w-full mb-2 border p-2 rounded">
                    <textarea v-model="newProduct.description" placeholder="Description" class="w-full mb-4 border p-2 rounded"></textarea>
                    <div class="flex justify-end gap-2">
                        <button @click="showCreateModal = false" class="text-gray-500">Cancel</button>
                        <button @click="createProduct" class="bg-indigo-600 text-white px-4 py-2 rounded">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `
};