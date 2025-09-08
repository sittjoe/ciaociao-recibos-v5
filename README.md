# CiaoCiao v5.0 - Jewelry Business Management System

A comprehensive business management system designed specifically for jewelry stores, built with modern web technologies and clean architecture principles.

## 🌟 Features

### Core Business Operations
- **Quotation Management**: Create, track, and manage customer quotations with detailed pricing
- **Receipt Generation**: Process sales and generate professional receipts
- **Client Management**: Maintain comprehensive customer profiles and purchase history
- **Product Catalog**: Manage jewelry inventory with detailed specifications
- **Payment Processing**: Track payments, deposits, and outstanding balances
- **PDF Generation**: Professional document generation for receipts and quotations

### Pricing & Calculations
- **Dynamic Pricing**: Real-time gold and precious metal price integration
- **Labor Cost Calculation**: Configurable labor rates and time estimates
- **Tax Management**: VAT calculation and compliance features
- **Discount Management**: Flexible discount system with percentage and fixed amounts
- **Multi-currency Support**: Exchange rate integration for international transactions

### User Experience
- **Responsive Design**: Mobile-first approach with Material-UI components
- **Offline Capability**: Local database with IndexedDB storage
- **Real-time Notifications**: In-app notifications for important events
- **Form Validation**: Comprehensive client and server-side validation
- **Authentication**: Secure user authentication and session management

## 🏗️ Architecture

### Clean Architecture Implementation
The application follows Domain-Driven Design (DDD) and Clean Architecture principles:

```
src/
├── core/                           # Business logic layer
│   ├── domain/                     # Domain entities and repositories
│   │   ├── entities/              # Business entities
│   │   └── repositories/          # Repository interfaces
│   ├── application/               # Application services and use cases
│   │   ├── services/              # Application services
│   │   └── use-cases/             # Business use cases
│   └── infrastructure/            # External concerns
│       ├── database/              # Data persistence
│       ├── api/                   # External APIs
│       └── events/                # Event handling
├── presentation/                   # UI layer
│   ├── components/                # React components
│   ├── pages/                     # Page components
│   └── stores/                    # State management
├── shared/                        # Shared utilities
│   ├── utils/                     # Utility functions
│   ├── types/                     # Type definitions
│   └── constants/                 # Application constants
└── infrastructure/                # Infrastructure services
    └── services/                  # Concrete implementations
```

### Design Patterns
- **Repository Pattern**: Data access abstraction
- **Use Case Pattern**: Business operation encapsulation  
- **Service Layer**: Application service coordination
- **Event-Driven Architecture**: Decoupled component communication
- **Dependency Injection**: Loose coupling and testability

## 🛠️ Technology Stack

### Frontend
- **React 19.1.1**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety throughout the application
- **Material-UI 7.3.2**: Comprehensive component library
- **Zustand 5.0.8**: Lightweight state management
- **React Hook Form 7.62.0**: Performant form handling
- **React Router DOM**: Client-side routing

### Data & Storage
- **Dexie.js 4.2.0**: IndexedDB wrapper for local storage
- **React Query**: Server state management and caching
- **Axios**: HTTP client for API communications

### PDF & Documents
- **jsPDF 3.0.2**: Client-side PDF generation
- **html2canvas**: HTML to image conversion
- **@react-pdf/renderer**: React-based PDF generation

### Development Tools
- **Vite 7.1.2**: Fast build tool and development server
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for code quality

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ciaociao-v5
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your environment variables.

4. **Start development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

### Scripts Overview

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:check` - Build with TypeScript checking
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## 📋 API Integration

The system is designed to integrate with external APIs for:

- **Metal Prices**: Real-time gold, silver, and precious metal pricing
- **Exchange Rates**: Multi-currency support
- **Payment Processing**: Integration with payment gateways
- **Tax Services**: VAT calculation and compliance

### Utility Functions

The application includes comprehensive utility functions:

#### Formatting Utilities (`src/shared/utils/formatting.ts`)
- Currency formatting for EUR
- Date and time formatting
- Phone number formatting (Irish format)
- File size formatting
- Percentage formatting

#### Validation Utilities (`src/shared/utils/validation.ts`)
- Email validation
- Irish phone number validation
- VAT number validation
- Price validation
- IBAN validation
- Form validation helpers

#### API Utilities (`src/shared/utils/api.ts`)
- HTTP client with interceptors
- Error handling and retry mechanisms
- File upload/download utilities
- Request caching
- Authentication token management

## 🗃️ Data Models

### Core Entities

#### Client
- Personal information and contact details
- Address and billing information
- Purchase history and preferences
- Credit and payment terms

#### Product
- Detailed specifications (material, weight, karat)
- Pricing information and categories
- Inventory tracking
- Cost calculations

#### Quotation
- Line items with detailed pricing
- Discount management
- Validity periods
- Conversion to receipts

#### Receipt
- Payment tracking
- Tax calculations
- PDF generation
- Status management

## 🔒 Security Features

- **Input Validation**: Comprehensive validation on all user inputs
- **Authentication**: Secure user session management
- **Data Sanitization**: Protection against XSS and injection attacks
- **Local Storage Encryption**: Sensitive data protection
- **CORS Configuration**: Secure cross-origin requests

## 🧪 Testing Strategy

The application is designed with testing in mind:
- Unit tests for business logic
- Integration tests for use cases
- Component tests for UI elements
- End-to-end tests for critical user flows

## 📱 PWA Support

The application includes Progressive Web App features:
- Offline functionality
- Service worker for caching
- App-like experience on mobile devices
- Background sync capabilities

## 🚀 Deployment

The application can be deployed to various platforms:
- **Netlify**: Static site deployment
- **Vercel**: Full-stack application hosting  
- **AWS S3**: Static site with CloudFront
- **Traditional hosting**: Standard web hosting providers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain clean architecture principles
- Write comprehensive tests
- Use conventional commit messages
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Material-UI team for the comprehensive component library
- React team for the amazing framework
- TypeScript team for type safety
- Vite team for the fast build tool
- All open source contributors who made this project possible

## 📞 Support

For support, please email [support@ciaociao.com](mailto:support@ciaociao.com) or create an issue in the repository.

---

Built with ❤️ using modern web technologies and clean architecture principles.