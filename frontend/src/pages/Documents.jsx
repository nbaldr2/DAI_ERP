import React, { useState, useEffect, useRef } from 'react';
import {
    FolderPlusIcon, DocumentTextIcon, DocumentArrowUpIcon,
    TrashIcon, MagnifyingGlassIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import documentService from '../services/documentService';
import { useAuth } from '../contexts/AuthContext';

const predefinedCategories = ['Financials', 'Contracts', 'HR', 'Receipts', 'Uncategorized'];

const Documents = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const { user } = useAuth();

    useEffect(() => {
        fetchDocuments();
    }, [selectedCategory]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await documentService.getDocuments(selectedCategory);
            setDocuments(res.data);
        } catch (error) {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Only PDF, XLS, XLSX, CSV, and TXT are allowed.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File exceeds 10MB limit.');
            return;
        }

        try {
            setUploading(true);
            const categoryToUse = selectedCategory || 'Uncategorized';
            await documentService.uploadDocument(file, categoryToUse);
            toast.success('Document uploaded successfully');
            fetchDocuments();
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to upload document';
            toast.error(msg);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            try {
                await documentService.deleteDocument(id);
                toast.success('Document deleted');
                fetchDocuments();
            } catch (error) {
                toast.error('Failed to delete document');
            }
        }
    };

    const getFileIcon = (mimeType) => {
        // A more dynamic icon could be placed here based on file type
        return <DocumentTextIcon className="w-10 h-10 text-emerald-400" />;
    };

    const filteredDocuments = documents.filter(doc =>
        doc.original_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                        Documents
                    </h1>
                    <p className="text-gray-400 mt-1">Manage and categorize your files securely</p>
                </div>

                <div className="relative w-64">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white placeholder-gray-400 transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Categories */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-white mb-4 px-2">Categories</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setSelectedCategory('')}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 ${selectedCategory === ''
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <FolderPlusIcon className="w-5 h-5" />
                                <span>All Documents</span>
                            </button>

                            {predefinedCategories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 ${selectedCategory === category
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <FolderPlusIcon className="w-5 h-5" />
                                    <span>{category}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">

                    {/* Upload Area */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 ${isDragging
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileInputChange}
                            className="hidden"
                            accept=".pdf,.xls,.xlsx,.csv,.txt"
                        />
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className={`p-4 rounded-full ${isDragging ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                                <DocumentArrowUpIcon className={`w-10 h-10 ${isDragging ? 'text-emerald-400' : 'text-gray-400'}`} />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-white">
                                    {uploading ? 'Uploading...' : 'Click to Upload or Drag and Drop'}
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Supported: PDF, XLS, XLSX, CSV, TXT (Max 10MB)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Documents Grid */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl min-h-[400px]">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
                            </div>
                        ) : filteredDocuments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                                <DocumentTextIcon className="w-16 h-16 opacity-20" />
                                <p className="text-lg">No documents found in this category</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredDocuments.map(doc => (
                                    <div key={doc.id} className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:border-emerald-500/30">

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                                {getFileIcon(doc.mime_type)}
                                            </div>
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={`http://localhost:4000${doc.path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors"
                                                    title="Download"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                                    className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-white font-medium truncate" title={doc.original_name}>
                                                {doc.original_name}
                                            </h4>
                                            <p className="text-xs text-gray-400 flex justify-between">
                                                <span>{doc.getReadableSize || (doc.size / 1024).toFixed(2) + ' KB'}</span>
                                                <span>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</span>
                                            </p>
                                            {doc.uploader && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Uploaded by: {doc.uploader.name}
                                                </p>
                                            )}
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Documents;
