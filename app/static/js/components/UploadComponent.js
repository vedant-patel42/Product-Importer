// Upload Component - Handles CSV file uploads with progress tracking
const UploadComponent = {
    setup() {
        const { ref } = Vue;
        
        // Upload State
        const uploading = ref(false);
        const uploadProgress = ref(0);
        const uploadStatusText = ref('');
        const uploadStatus = ref(false);
        const uploadError = ref(null);

        // Upload Logic
        const handleFileUpload = async (e) => {
            const file = e.target.files[0];
            console.log("Selected file:", file);
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await api.uploadFile(formData);
                uploading.value = true;
                uploadError.value = null;
                uploadStatusText.value = 'Initializing upload...';
                
                console.log("Upload response:", res);
                pollTask(res.task_id);
            } catch (err) {
                console.error("Upload error:", err);
                uploadError.value = "Upload failed: " + err.message;
                uploading.value = false;
            }
        };

        const pollTask = (taskId) => {
            const interval = setInterval(async () => {
                const res = await api.getTaskStatus(taskId);
                uploadProgress.value = res.progress;
                uploadStatusText.value = res.info;
                uploadStatus.value = true;

                if (res.state === 'SUCCESS' || res.state === 'FAILURE') {
                    clearInterval(interval);
                    uploading.value = false;
                    if (res.state === 'SUCCESS') {
                        // Emit event to refresh products
                        window.dispatchEvent(new CustomEvent('upload-complete'));
                    }
                }
            }, 1000);
        };

        return {
            uploading,
            uploadProgress,
            uploadStatusText,
            uploadStatus,
            uploadError,
            handleFileUpload
        };
    },
    template: `
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-6">Import Products CSV</h2>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition cursor-pointer relative">
                <input type="file" @change="handleFileUpload" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv">
                <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-600">Drag and drop or click to upload CSV</p>
                <p class="text-xs text-gray-400 mt-2">Max 500k records. Columns: name, sku, description</p>
            </div>

            <div v-if="uploading || uploadStatus" class="mt-6">
                <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium text-indigo-700">{{ uploadStatusText }}</span>
                    <span class="text-sm font-medium text-indigo-700">{{ uploadProgress }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" :style="{ width: uploadProgress + '%' }"></div>
                </div>
                <div v-if="uploadError" class="mt-2 text-red-500 text-sm">
                    <i class="fas fa-exclamation-circle"></i> {{ uploadError }}
                </div>
            </div>
        </div>
    `
};