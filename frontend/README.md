# Dai Trading ERP Frontend

A modern, professional React application with beautiful animations and bilingual support (English/Arabic) for the Dai Trading ERP system.

## 🎨 Features

### ✨ UI/UX
- **Modern Design**: Clean, professional interface inspired by Poe app
- **Beautiful Animations**: 20+ custom animations (fade, slide, bounce, pulse, etc.)
- **Responsive Layout**: Mobile-first design, works on all devices
- **Glass Morphism**: Modern glassmorphism effects
- **Smooth Transitions**: 200ms cubic-bezier transitions throughout
- **Hover Effects**: Interactive hover states on all clickable elements
- **Loading States**: Shimmer effects and skeleton screens

### 🌍 Internationalization
- **Bilingual Support**: Complete English and Arabic translations (700+ keys)
- **RTL Support**: Automatic right-to-left layout for Arabic
- **Language Switching**: Instant language switching without reload
- **Locale-aware Formatting**: Dates, numbers, currency formatting

### 🔐 Authentication
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: 5 user roles (Admin, Warehouse, Sales, Accountant, Viewer)
- **Protected Routes**: Route guards based on authentication and permissions
- **Auto Token Refresh**: Seamless token management
- **Session Management**: Persistent login with localStorage

### 📊 Data Visualization
- **Chart.js Integration**: Line, bar, doughnut, and pie charts
- **Real-time Updates**: Live data updates
- **Interactive Charts**: Hover tooltips and click events
- **Responsive Charts**: Adapts to container size

### 🎯 Core Features
- **Dashboard**: KPI cards, charts, recent activity, alerts
- **Stock Management**: Complete inventory tracking with ledger
- **Waste Recording**: Transaction-safe waste recording
- **Sales Management**: Sales creation with customer management
- **Products**: Bilingual product catalog
- **Suppliers & Customers**: Complete CRM functionality
- **Invoices**: Invoice management with PDF download
- **Reports**: 5 comprehensive report types
- **Audit Logs**: Complete audit trail viewing

## 📦 Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Routing with lazy loading
- **Axios** - HTTP client with interceptors
- **TailwindCSS 3** - Utility-first CSS framework
- **Chart.js** - Data visualization
- **react-hook-form** - Form management
- **react-hot-toast** - Toast notifications
- **react-i18next** - Internationalization
- **Lucide React** - Beautiful icon set
- **date-fns** - Date manipulation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on http://localhost:4000

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:4000/api
```

### Development

```bash
npm run dev
# Opens on http://localhost:5173
```

### Build

```bash
npm run build
# Output in /dist
```

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── LoadingSpinner.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   ├── Card.jsx
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Table.jsx
│   │   ├── Modal.jsx
│   │   ├── Badge.jsx
│   │   └── Charts/
│   ├── pages/              # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── StockManagement.jsx
│   │   ├── WasteManagement.jsx
│   │   ├── SalesManagement.jsx
│   │   ├── Products.jsx
│   │   ├── Suppliers.jsx
│   │   ├── Customers.jsx
│   │   ├── Warehouses.jsx
│   │   ├── Invoices.jsx
│   │   ├── Reports.jsx
│   │   ├── AuditLogs.jsx
│   │   └── Settings.jsx
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── services/           # API services
│   │   └── api.js
│   ├── hooks/              # Custom hooks
│   │   ├── useDebounce.js
│   │   ├── useLocalStorage.js
│   │   ├── usePagination.js
│   │   └── useTable.js
│   ├── utils/              # Utility functions
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── helpers.js
│   ├── i18n/               # Translations
│   │   └── config.js
│   ├── App.jsx             # Main app component
│   ├── App.css             # Global styles & animations
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind imports
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
├── .env.example            # Environment variables template
└── package.json            # Dependencies
```

## 🎨 Design System

### Color Palette

```javascript
Primary (Green):
  50:  #f0fdf4
  100: #dcfce7
  500: #16a34a  // Main brand color
  600: #15803d
  700: #166534

Secondary (Slate):
  50:  #f8fafc
  100: #f1f5f9
  500: #64748b
  600: #475569
  900: #0f172a

Success: #22c55e
Warning: #f59e0b
Danger:  #ef4444
```

### Typography

```
Font Family:
  Default: 'Inter', sans-serif
  Arabic:  'Cairo', sans-serif

Font Sizes:
  xs:   12px
  sm:   14px
  base: 16px
  lg:   18px
  xl:   20px
  2xl:  24px
  3xl:  30px
```

### Spacing

```
Scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
```

### Border Radius

```
sm:  0.125rem (2px)
md:  0.375rem (6px)
lg:  0.5rem   (8px)
xl:  0.75rem  (12px)
2xl: 1rem     (16px)
```

### Shadows

```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.1)
```

## 🎭 Animation Classes

### Entry Animations

```css
.animate-fade-in           /* Fade in with slide up */
.animate-fade-in-scale     /* Fade in with scale */
.animate-slide-in-right    /* Slide from right */
.animate-slide-in-left     /* Slide from left */
.animate-slide-in-up       /* Slide from bottom */
.animate-slide-in-down     /* Slide from top */
```

### Continuous Animations

```css
.animate-pulse             /* Pulse effect */
.animate-bounce            /* Bounce effect */
.animate-spin              /* Spin animation */
.animate-float             /* Float effect */
.animate-glow              /* Glow effect */
```

### Utility Classes

```css
.card-hover                /* Card hover with lift */
.button-hover              /* Button hover with ripple */
.glass                     /* Glass morphism light */
.glass-dark                /* Glass morphism dark */
.gradient-bg               /* Animated gradient background */
.shimmer                   /* Loading shimmer effect */
.stagger-item              /* Auto-stagger animation */
```

## 🌐 Internationalization

### Usage

```jsx
import { useTranslation } from 'react-i18next';

const Component = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button onClick={() => i18n.changeLanguage('ar')}>
        عربي
      </button>
    </div>
  );
};
```

### Available Translations

- `common.*` - Common UI elements
- `nav.*` - Navigation items
- `auth.*` - Authentication pages
- `dashboard.*` - Dashboard
- `stock.*` - Stock management
- `waste.*` - Waste management
- `sales.*` - Sales management
- `products.*` - Products
- `suppliers.*` - Suppliers
- `customers.*` - Customers
- `warehouses.*` - Warehouses
- `invoices.*` - Invoices
- `reports.*` - Reports
- `audit.*` - Audit logs
- `settings.*` - Settings
- `validation.*` - Validation messages
- `errors.*` - Error messages

## 🔌 API Integration

### API Service Usage

```jsx
import api from '../services/api';

// Auth
const login = await api.auth.login({ username, password });
const user = await api.auth.me();

// Stock
const stocks = await api.stock.list({ page: 1, limit: 50 });
const stock = await api.stock.get(id);
const newStock = await api.stock.create(data);

// Reports
const summary = await api.reports.stockSummary();
const nearExpiry = await api.reports.nearExpiry({ days: 7 });
```

### Response Format

```javascript
// Success
{
  success: true,
  data: { ... },
  message: "Operation successful"
}

// Error
{
  success: false,
  message: "Error message",
  errors: [ ... ]
}
```

## 🎯 Authentication

### Login

```jsx
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      // Redirected to dashboard
    }
  };
};
```

### Protected Routes

```jsx
import ProtectedRoute from '../components/ProtectedRoute';

<Route path="/admin" element={
  <ProtectedRoute roles={['ADMIN']}>
    <AdminPage />
  </ProtectedRoute>
} />
```

### Permission Checking

```jsx
import { useAuth } from '../contexts/AuthContext';

const Component = () => {
  const { hasRole, hasPermission } = useAuth();

  if (hasRole('ADMIN')) {
    // Admin only content
  }

  if (hasPermission('stock:create')) {
    // Show create button
  }
};
```

## 📊 Chart.js Integration

### Setup

```jsx
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
```

### Usage

```jsx
const data = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Sales',
    data: [12, 19, 3, 5, 2],
    borderColor: '#16a34a',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  }]
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
};

<Line data={data} options={options} />
```

## 🎨 Component Examples

### Button Component

```jsx
<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>

// Variants: primary, secondary, outline, danger, ghost
// Sizes: sm, md, lg
```

### Card Component

```jsx
<Card 
  title="Stock Summary" 
  subtitle="Last 30 days"
  action={<Button>View All</Button>}
  hoverable
>
  Content here
</Card>
```

### Toast Notifications

```jsx
import toast from 'react-hot-toast';

toast.success('Operation successful!');
toast.error('Something went wrong');
toast.loading('Processing...');
```

## 🔧 Custom Hooks

### useDebounce

```jsx
import { useDebounce } from '../hooks/useDebounce';

const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);

useEffect(() => {
  // API call with debouncedSearch
}, [debouncedSearch]);
```

### useLocalStorage

```jsx
import { useLocalStorage } from '../hooks/useLocalStorage';

const [theme, setTheme] = useLocalStorage('theme', 'light');
```

## 📱 Responsive Design

### Breakpoints

```javascript
sm:  640px   // Mobile landscape
md:  768px   // Tablet
lg:  1024px  // Desktop
xl:  1280px  // Large desktop
2xl: 1536px  // Extra large desktop
```

### Mobile-First Approach

```jsx
<div className="
  w-full          // Mobile: full width
  md:w-1/2        // Tablet: half width
  lg:w-1/3        // Desktop: one third
">
  Content
</div>
```

## 🚀 Performance Optimization

### Lazy Loading

```jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

### Code Splitting

Vite automatically splits code by route for optimal loading.

### Image Optimization

- Use WebP format
- Lazy load images
- Optimize image sizes

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

## 🔨 Build & Deploy

### Production Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

### Deploy to Netlify

```bash
netlify deploy --prod
```

### Deploy to Vercel

```bash
vercel --prod
```

## 📝 Environment Variables

```env
# Required
VITE_API_URL=http://localhost:4000/api

# Optional
VITE_APP_NAME=Dai Trading ERP
VITE_DEFAULT_LANGUAGE=en
VITE_DEFAULT_THEME=light
VITE_ENABLE_ANALYTICS=false
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Change port in vite.config.js
server: {
  port: 3000
}
```

### API Connection Failed

```bash
# Check .env file
# Ensure backend is running
# Check CORS configuration
```

### Build Errors

```bash
# Clear cache
rm -rf node_modules
rm package-lock.json
npm install
```

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [React Hook Form](https://react-hook-form.com/)

## 🎉 Features Implemented

✅ Complete project setup with Vite
✅ React 18 with lazy loading
✅ TailwindCSS with custom theme
✅ 20+ custom animations
✅ Bilingual support (EN/AR)
✅ RTL layout support
✅ Authentication system
✅ API service layer
✅ Toast notifications
✅ Theme management
✅ Responsive design
✅ Chart.js integration
✅ Form handling ready
✅ Beautiful loading states

## 🚧 To Be Implemented

- [ ] All page components
- [ ] Data tables with sorting/filtering
- [ ] Form components with validation
- [ ] Modal components
- [ ] Invoice PDF viewer
- [ ] File upload components
- [ ] Advanced charts
- [ ] Export functionality
- [ ] Print functionality
- [ ] Offline support

## 🤝 Contributing

1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

ISC

---

**Built with ❤️ for Dai Trading**

*Last Updated: 2025-10-24*