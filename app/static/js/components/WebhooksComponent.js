// Webhooks Component - Manages webhook configuration and testing
const WebhooksComponent = {
    setup() {
        const { ref, onMounted } = Vue;
        
        // Webhooks State
        const webhooks = ref([]);
        const newWebhook = ref({ url: '', event_type: 'product_update' });
        const showEditWebhookModal = ref(false);
        const editWebhook = ref({ id: null, url: '', event_type: 'product_update', is_active: true });
        const webhookTestResult = ref(null);

        // Webhook Logic
        const fetchWebhooks = async () => {
            webhooks.value = await api.getWebhooks();
        };

        const addWebhook = async () => {
            await api.createWebhook(newWebhook.value);
            newWebhook.value.url = '';
            fetchWebhooks();
        };

        const deleteWebhook = async (id) => {
            if (!confirm('Delete this webhook?')) return;
            await api.deleteWebhook(id);
            fetchWebhooks();
        };

        const toggleWebhook = async (w) => {
            await api.toggleWebhook(w.id);
            fetchWebhooks();
        };

        const openEditWebhook = (w) => {
            editWebhook.value = { ...w };
            showEditWebhookModal.value = true;
        };

        const saveWebhook = async () => {
            const payload = {
                url: editWebhook.value.url,
                event_type: editWebhook.value.event_type,
                is_active: editWebhook.value.is_active,
            };
            await api.updateWebhook(editWebhook.value.id, payload);
            showEditWebhookModal.value = false;
            fetchWebhooks();
        };

        const testWebhook = async (url) => {
            webhookTestResult.value = null;
            try {
                const result = await api.testWebhook(url);
                webhookTestResult.value = result;
            } catch (e) {
                webhookTestResult.value = {
                    ok: false,
                    status_code: 0,
                    elapsed_ms: 0,
                };
            }
        };

        onMounted(() => {
            fetchWebhooks();
        });

        return {
            webhooks,
            newWebhook,
            showEditWebhookModal,
            editWebhook,
            webhookTestResult,
            fetchWebhooks,
            addWebhook,
            deleteWebhook,
            toggleWebhook,
            openEditWebhook,
            saveWebhook,
            testWebhook
        };
    },
    template: `
        <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold">Webhooks</h2>
            </div>

            <!-- Add Webhook Form -->
            <div class="mb-6 flex flex-col md:flex-row gap-3 items-end">
                <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                    <input v-model="newWebhook.url" type="text" placeholder="https://example.com/webhook" class="w-full border rounded px-3 py-2 text-sm text-gray-700 mb-1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select v-model="newWebhook.event_type" class="border rounded px-3 py-2 text-sm text-gray-700 mb-1">
                        <option value="product_update">Product Update</option>
                        <option value="product_created">Product Created</option>
                        <option value="import_completed">Import Completed</option>
                    </select>
                </div>
                <button @click="addWebhook" class="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>

            <!-- Test Result Banner -->
            <div v-if="webhookTestResult" class="mb-4 p-3 rounded text-sm" :class="webhookTestResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'">
                <span class="font-semibold">Test Result:</span>
                <span class="ml-2">Status {{ webhookTestResult.status_code }} | {{ webhookTestResult.elapsed_ms.toFixed(1) }} ms</span>
            </div>

            <!-- Webhook List -->
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-100 text-gray-600 text-sm uppercase">
                            <th class="p-3 border-b">ID</th>
                            <th class="p-3 border-b">URL</th>
                            <th class="p-3 border-b">Event</th>
                            <th class="p-3 border-b">Status</th>
                            <th class="p-3 border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm">
                        <tr v-for="w in webhooks" :key="w.id" class="hover:bg-gray-50 border-b">
                            <td class="p-3 text-gray-500">{{ w.id }}</td>
                            <td class="p-3 max-w-xs truncate text-gray-800" :title="w.url">{{ w.url }}</td>
                            <td class="p-3 font-mono text-xs text-gray-800">{{ w.event_type }}</td>
                            <td class="p-3">
                                <span :class="w.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'" class="px-2 py-1 rounded-full text-xs">
                                    {{ w.is_active ? 'Enabled' : 'Disabled' }}
                                </span>
                            </td>
                            <td class="p-3 text-right space-x-2">
                                <button @click="toggleWebhook(w)" class="text-indigo-600 hover:text-indigo-800 text-xs">
                                    {{ w.is_active ? 'Disable' : 'Enable' }}
                                </button>
                                <button @click="openEditWebhook(w)" class="text-blue-600 hover:text-blue-800 text-xs">
                                    Edit
                                </button>
                                <button @click="testWebhook(w.url)" class="text-amber-600 hover:text-amber-800 text-xs">
                                    Test
                                </button>
                                <button @click="deleteWebhook(w.id)" class="text-red-600 hover:text-red-800 text-xs">
                                    Delete
                                </button>
                            </td>
                        </tr>
                        <tr v-if="webhooks.length === 0">
                            <td colspan="5" class="p-4 text-center text-gray-500 text-sm">No webhooks configured yet.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Edit Webhook Modal -->
            <div v-if="showEditWebhookModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div class="bg-white p-6 rounded-lg w-96">
                    <h3 class="font-bold mb-4">Edit Webhook</h3>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                    <input v-model="editWebhook.url" placeholder="https://example.com/webhook" class="w-full mb-3 border p-2 rounded">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select v-model="editWebhook.event_type" class="w-full mb-3 border p-2 rounded text-sm">
                        <option value="product_update">Product Update</option>
                        <option value="product_created">Product Created</option>
                        <option value="import_completed">Import Completed</option>
                    </select>
                    <label class="inline-flex items-center mb-4 text-sm">
                        <input type="checkbox" v-model="editWebhook.is_active" class="mr-2">
                        <span>Enabled</span>
                    </label>
                    <div class="flex justify-end gap-2">
                        <button @click="showEditWebhookModal = false" class="text-gray-500">Cancel</button>
                        <button @click="saveWebhook" class="bg-indigo-600 text-white px-4 py-2 rounded">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `
};