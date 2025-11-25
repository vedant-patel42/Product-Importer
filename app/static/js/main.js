// Main Vue Application - Product Importer
const { createApp, ref, onMounted } = Vue;

console.log('Vue loaded');

// Main App Component
const App = {
    setup() {
        const currentTab = ref('upload');
        
        console.log("App setup complete");

        onMounted(() => {
            console.log("App mounted");
        });

        return {
            currentTab
        };
    },
    components: {
        'upload-component': UploadComponent,
        'products-component': ProductsComponent,
        'webhooks-component': WebhooksComponent
    },
    template: `
        <div id="app" class="min-h-screen flex flex-col">
            <!-- Header -->
            <nav class="bg-indigo-600 text-white p-4 shadow-lg">
                <div class="container mx-auto flex justify-between items-center">
                    <h1 class="text-2xl font-bold tracking-tight"><i class="fas fa-box-open mr-2"></i>Acme Inc.</h1>
                    <div class="space-x-4">
                        <button @click="currentTab = 'upload'" :class="{'font-bold underline': currentTab === 'upload'}" class="hover:text-indigo-200">Upload</button>
                        <button @click="currentTab = 'products'" :class="{'font-bold underline': currentTab === 'products'}" class="hover:text-indigo-200">Products</button>
                        <button @click="currentTab = 'webhooks'" :class="{'font-bold underline': currentTab === 'webhooks'}" class="hover:text-indigo-200">Webhooks</button>
                    </div>
                </div>
            </nav>

            <!-- Main Content -->
            <main class="container mx-auto p-6 flex-grow">
                <!-- Upload Tab -->
                <upload-component v-if="currentTab === 'upload'" />
                
                <!-- Products Tab -->
                <products-component v-if="currentTab === 'products'" />
                
                <!-- Webhooks Tab -->
                <webhooks-component v-if="currentTab === 'webhooks'" />
            </main>
        </div>
    `
};

// Initialize Vue App
createApp(App).mount('#app');

console.log('Vue app mounted successfully');