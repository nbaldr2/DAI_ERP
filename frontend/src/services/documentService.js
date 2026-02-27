import api from './api';

const documentService = {
    // Get all documents, optionally filtered by category
    getDocuments: async (category = '') => {
        try {
            const response = await api.get('/documents', {
                params: { category }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching documents in service:', error);
            throw error;
        }
    },

    // Upload a new document
    uploadDocument: async (file, category) => {
        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('category', category);

            const response = await api.post('/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading document in service:', error);
            throw error;
        }
    },

    // Delete a document
    deleteDocument: async (id) => {
        try {
            const response = await api.delete(`/documents/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting document in service:', error);
            throw error;
        }
    }
};

export default documentService;
