import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Download,
    FileText,
    Save,
    Tag,
    CheckSquare,
    Square,
    Edit2
} from 'lucide-react';
import { usePriceList, useBulkUpdateProducts } from '../hooks/queries/useProducts';
import LoadingSpinner from '../components/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

const PriceList = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [priceType, setPriceType] = useState('retail'); // 'retail' or 'wholesale'
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editedPrices, setEditedPrices] = useState({});
    const [editingId, setEditingId] = useState(null);

    const { data: priceListData, isLoading } = usePriceList();
    const rawProducts = priceListData?.data || [];
    const { mutate: bulkUpdate, isPending: isSaving } = useBulkUpdateProducts();

    // Merge edited prices with server data
    const products = useMemo(() => {
        return rawProducts.map(p => ({
            ...p,
            price_per_unit: editedPrices[p.id]?.price_per_unit ?? p.price_per_unit,
            wholesale_price: editedPrices[p.id]?.wholesale_price ?? p.wholesale_price,
        }));
    }, [rawProducts, editedPrices]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;

        if (categoryFilter) {
            result = result.filter(p => p.category === categoryFilter);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.name_en?.toLowerCase().includes(lower) ||
                p.name_ar?.toLowerCase().includes(lower) ||
                p.category?.toLowerCase().includes(lower)
            );
        }

        return result;
    }, [products, searchTerm, categoryFilter]);

    // Unique Categories
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [products]);

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // Editing logic
    const handlePriceChange = (id, field, value) => {
        const numValue = parseFloat(value) || 0;
        setEditedPrices(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: numValue
            }
        }));
    };

    const hasChanges = Object.keys(editedPrices).length > 0;

    const handleSave = () => {
        if (!hasChanges) return;

        const updates = Object.entries(editedPrices).map(([id, changes]) => ({
            id: parseInt(id),
            ...changes
        }));

        bulkUpdate({ updates }, {
            onSuccess: () => {
                setEditedPrices({});
                setEditingId(null);
            }
        });
    };

    // Export Logic
    const getSelectedData = () => {
        const selected = filteredProducts.filter(p => selectedIds.has(p.id));
        return selected.length > 0 ? selected : filteredProducts;
    };

    const exportPDF = () => {
        const data = getSelectedData();
        if (data.length === 0) return toast.error("No products to export");

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const COLORS = {
            primary: [31, 78, 94],
            secondary: [45, 55, 72],
            text: [45, 55, 72],
            white: [255, 255, 255],
            muted: [113, 128, 150],
            border: [226, 232, 240],
            gold: [180, 142, 75]
        };

        // Header background with gradient effect
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Gold accent line
        doc.setFillColor(...COLORS.gold);
        doc.rect(0, 45, pageWidth, 2, 'F');

        // Company name in header
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('DAI TRADING W.L.L', 15, 25);

        // Tagline
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Fresh Food Trading Company', 15, 36);

        // PRICE LIST label on the right
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PRICE LIST', pageWidth - 15, 28, { align: 'right' });

        // Reset text color
        doc.setTextColor(...COLORS.text);

        // Document Details Box
        const boxX = 15;
        const boxY = 55;
        const boxWidth = 80;
        const boxHeight = 25;

        doc.setFillColor(247, 250, 252);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

        const details = [
            { label: 'Date:', value: new Date().toLocaleDateString() },
            { label: 'Price Type:', value: priceType === 'retail' ? 'Retail Prices' : 'Wholesale Prices' },
        ];

        doc.setFontSize(9);
        details.forEach((detail, index) => {
            const y = boxY + 8 + (index * 8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.muted);
            doc.text(detail.label, boxX + 5, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLORS.text);
            doc.text(detail.value, boxX + 32, y);
        });

        // Build table columns and rows based on price type
        const tableColumn = ["#", "Product", "Category", "Unit", "Price (Qr)"];
        const tableRows = data.map((p, index) => [
            index + 1,
            p.name_en || '-',
            p.category || '-',
            p.unit || '-',
            parseFloat(priceType === 'retail' ? p.price_per_unit || 0 : p.wholesale_price || 0).toFixed(2)
        ]);

        autoTable(doc, {
            startY: 90,
            head: [tableColumn],
            body: tableRows,
            theme: 'plain',
            headStyles: {
                fillColor: COLORS.primary,
                textColor: COLORS.white,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                cellPadding: 4
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: COLORS.text
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 70 },
                2: { cellWidth: 50, textColor: COLORS.muted },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [250, 250, 252]
            },
            tableLineColor: COLORS.border,
            tableLineWidth: 0.1,
            margin: { left: 15, right: 15 }
        });

        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerY = pageHeight - 20;

            doc.setFillColor(...COLORS.primary);
            doc.rect(0, footerY, pageWidth, 20, 'F');
            doc.setFillColor(...COLORS.gold);
            doc.rect(0, footerY, pageWidth, 1, 'F');

            doc.setTextColor(...COLORS.white);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('DAI TRADING W.L.L | C.R: 116392 | TEL: 3000 8935 | EMAIL: contact@dai-trading.com', pageWidth / 2, footerY + 10, { align: 'center' });

            doc.setFontSize(6);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 10, footerY + 15, { align: 'right' });
        }

        doc.save(`price_list_${priceType}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportExcel = () => {
        const data = getSelectedData();
        if (data.length === 0) return toast.error("No products to export");

        const BOM = "\uFEFF";
        let csvContent = "data:text/csv;charset=utf-8," + BOM;

        // Header
        const headers = ["Product Name", "Category", "Unit", "Retail Price", "Wholesale Price"];
        csvContent += headers.join(",") + "\r\n";

        // Rows
        data.forEach(p => {
            const row = [
                `"${p.name_en ? p.name_en.replace(/"/g, '""') : ''}"`,
                `"${p.category || ''}"`,
                p.unit || '',
                p.price_per_unit || 0,
                p.wholesale_price || 0
            ];
            csvContent += row.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `price_list_all_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen message="Loading price list..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Tag className="w-6 h-6 text-primary-500" />
                        Price List
                    </h1>
                    <p className="text-text-secondary mt-1">Manage and export your product prices</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {hasChanges && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <Save className="w-5 h-5 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}

                    <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block"></div>

                    <button
                        onClick={exportPDF}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Export PDF
                    </button>

                    <button
                        onClick={exportExcel}
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-card rounded-xl shadow-sm border border-theme-border p-4">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">

                    <div className="flex flex-col sm:flex-row w-full lg:w-auto flex-1 gap-4">
                        <div className="relative w-full lg:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products by name or category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg bg-background text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                            />
                        </div>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full sm:w-48 px-3 py-2 border border-theme-border rounded-lg bg-background text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full lg:w-auto">
                        <button
                            className={`flex-1 lg:flex-none px-6 py-2 rounded-md font-medium text-sm transition-all shadow-sm ${priceType === 'retail'
                                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-600'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            onClick={() => setPriceType('retail')}
                        >
                            Retail Prices
                        </button>
                        <button
                            className={`flex-1 lg:flex-none px-6 py-2 rounded-md font-medium text-sm transition-all shadow-sm ${priceType === 'wholesale'
                                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-600'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            onClick={() => setPriceType('wholesale')}
                        >
                            Wholesale Prices
                        </button>
                    </div>

                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl shadow-sm border border-theme-border overflow-hidden">
                {filteredProducts.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium">No products found</h3>
                        <p>Try adjusting your search criteria</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-theme-border">
                                    <th className="px-4 py-3 w-12 text-center">
                                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-primary-600 transition-colors">
                                            {selectedIds.size === filteredProducts.length ? (
                                                <CheckSquare className="w-5 h-5 inline text-primary-500" />
                                            ) : (
                                                <Square className="w-5 h-5 inline" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Product Name</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">Category</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Unit</th>
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-right ${priceType === 'retail' ? 'text-primary-600 bg-primary-50/50 dark:bg-primary-900/20' : 'text-text-secondary'}`}>
                                        Retail Price (Qr)
                                    </th>
                                    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-right ${priceType === 'wholesale' ? 'text-primary-600 bg-primary-50/50 dark:bg-primary-900/20' : 'text-text-secondary'}`}>
                                        Wholesale Price (Qr)
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">Edit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-border">
                                {filteredProducts.map(product => {
                                    const isSelected = selectedIds.has(product.id);
                                    const isEditing = editingId === product.id;
                                    const hasEditedThisRow = !!editedPrices[product.id];

                                    return (
                                        <tr
                                            key={product.id}
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isSelected ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                                        >
                                            <td className="px-4 py-4 text-center">
                                                <button onClick={() => toggleSelect(product.id)} className="text-gray-400 hover:text-primary-600 transition-colors">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 inline text-primary-500" />
                                                    ) : (
                                                        <Square className="w-5 h-5 inline" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-text-primary">{product.name_en}</div>
                                                {product.name_ar && <div className="text-sm text-text-secondary">{product.name_ar}</div>}
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell text-sm text-text-secondary">
                                                {product.category || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 font-medium text-xs text-text-primary border border-theme-border">
                                                    {product.unit}
                                                </span>
                                            </td>

                                            {/* Retail Price Column */}
                                            <td className={`px-6 py-4 text-right transition-colors ${priceType === 'retail' ? 'bg-primary-50/10 dark:bg-primary-900/10' : ''}`}>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 px-2 py-1 text-right border border-primary-400 rounded-md focus:ring-2 focus:ring-primary-500 outline-none bg-background text-text-primary"
                                                        value={product.price_per_unit || ''}
                                                        onChange={(e) => handlePriceChange(product.id, 'price_per_unit', e.target.value)}
                                                        autoFocus={priceType === 'retail'}
                                                    />
                                                ) : (
                                                    <div
                                                        className={`font-medium select-none cursor-pointer ${hasEditedThisRow && editedPrices[product.id].price_per_unit !== undefined ? 'text-orange-600 dark:text-orange-400' : 'text-text-primary'}`}
                                                        onDoubleClick={() => setEditingId(product.id)}
                                                        title="Double-click to edit"
                                                    >
                                                        {parseFloat(product.price_per_unit || 0).toFixed(2)}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Wholesale Price Column */}
                                            <td className={`px-6 py-4 text-right transition-colors ${priceType === 'wholesale' ? 'bg-primary-50/10 dark:bg-primary-900/10' : ''}`}>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 px-2 py-1 text-right border border-primary-400 rounded-md focus:ring-2 focus:ring-primary-500 outline-none bg-background text-text-primary"
                                                        value={product.wholesale_price || ''}
                                                        onChange={(e) => handlePriceChange(product.id, 'wholesale_price', e.target.value)}
                                                        autoFocus={priceType === 'wholesale'}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') setEditingId(null);
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className={`font-medium select-none cursor-pointer ${hasEditedThisRow && editedPrices[product.id].wholesale_price !== undefined ? 'text-orange-600 dark:text-orange-400' : 'text-text-primary'}`}
                                                        onDoubleClick={() => setEditingId(product.id)}
                                                        title="Double-click to edit"
                                                    >
                                                        {parseFloat(product.wholesale_price || 0).toFixed(2)}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => setEditingId(isEditing ? null : product.id)}
                                                    className={`p-1.5 rounded-md transition-colors ${isEditing ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400' : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                    title={isEditing ? 'Stop editing' : 'Edit price'}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Selected Footnote */}
            {selectedIds.size > 0 && (
                <div className="text-sm text-text-secondary flex items-center justify-between px-2">
                    <span><strong className="text-primary-600">{selectedIds.size}</strong> product{selectedIds.size > 1 ? 's' : ''} selected</span>
                    <span className="text-xs">Export will only include selected products</span>
                </div>
            )}
        </div>
    );
};

export default PriceList;
