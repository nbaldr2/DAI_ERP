import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const ProductCard = memo(function ProductCard({ product, onAddToCart, inCart }) {
    const { t, i18n } = useTranslation();
    const stockClass = product.stock > 10
        ? 'stock-high'
        : product.stock > 0
            ? 'stock-low'
            : 'stock-out';

    const stockText = product.stock > 10
        ? `${product.stock} ${product.unit}`
        : product.stock > 0
            ? `${t('pos.lowStock', 'Low')}: ${product.stock} ${product.unit}`
            : t('pos.outOfStock', 'Out of Stock');

    return (
        <motion.button
            className={`pos-product-card ${inCart ? 'in-cart' : ''} ${product.stock === 0 ? 'disabled' : ''}`}
            onClick={() => product.stock > 0 && onAddToCart(product)}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            disabled={product.stock === 0}
        >
            <div className="pos-product-name">
                {i18n.language === 'ar' ? (product.name_ar || product.name_en) : product.name_en}
                {i18n.language === 'ar' && product.name_en && product.name_en !== product.name_ar && (
                    <span className="pos-product-name-ar"> / {product.name_en}</span>
                )}
                {i18n.language !== 'ar' && product.name_ar && (
                    <span className="pos-product-name-ar"> / {product.name_ar}</span>
                )}
            </div>
            <div className="pos-product-price">
                {product.price.toFixed(2)}
            </div>
            <div className={`pos-product-stock ${stockClass}`}>
                <span className="stock-dot" />
                {stockText}
            </div>
            {inCart && (
                <div className="pos-product-in-cart-badge">
                    ✓
                </div>
            )}
        </motion.button>
    );
});

export default function ProductGrid({
    products,
    categories,
    selectedCategory,
    onSelectCategory,
    onAddToCart,
    isLoading,
    cart,
}) {
    const { t } = useTranslation();

    // Create a map of product IDs in cart for quick lookup
    const cartProductIds = useMemo(() => {
        return new Set(cart.map(item => item.product_id));
    }, [cart]);

    // Filter products by selected category
    const filteredProducts = useMemo(() => {
        if (!selectedCategory) return products;
        return products.filter(p => p.category === selectedCategory);
    }, [products, selectedCategory]);

    if (isLoading) {
        return (
            <div className="pos-products-loading">
                <div className="pos-spinner" />
                <p>{t('pos.loading')}</p>
            </div>
        );
    }

    return (
        <div className="pos-product-grid-container">
            {/* Category Tabs */}
            <div className="pos-category-tabs">
                <button
                    className={`pos-category-tab ${!selectedCategory ? 'active' : ''}`}
                    onClick={() => onSelectCategory('')}
                >
                    {t('pos.allCategories')}
                </button>
                {categories.map(category => (
                    <button
                        key={category}
                        className={`pos-category-tab ${selectedCategory === category ? 'active' : ''}`}
                        onClick={() => onSelectCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="pos-product-grid">
                {filteredProducts.length === 0 ? (
                    <div className="pos-no-products">
                        <p>{t('pos.noProductsFound')}</p>
                    </div>
                ) : (
                    filteredProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={onAddToCart}
                            inCart={cartProductIds.has(product.id)}
                        />
                    ))
                )}
            </div>

            {/* Product count */}
            <div className="pos-product-count">
                {filteredProducts.length} {t('pos.products', 'products')}
                {selectedCategory && ` ${t('pos.inCategory', 'in')} ${selectedCategory}`}
            </div>
        </div>
    );
}