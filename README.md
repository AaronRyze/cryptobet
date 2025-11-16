# CryptoBet - Crypto Betting Platform
<img width="1331" height="812" alt="image" src="https://github.com/user-attachments/assets/66a073c9-0289-4b78-a82a-e6adf297c2e1" />
<img width="1888" height="908" alt="image" src="https://github.com/user-attachments/assets/6f44d06b-36b9-40a5-9a96-afe5368da286" />
<img width="1883" height="915" alt="image" src="https://github.com/user-attachments/assets/2f4800f4-9979-4c62-8a6a-3301327ff85d" />

## Overview

CryptoBet is a full-stack cryptocurrency betting platform that allows users to place bets on various casino-style games using cryptocurrency (USDT). The platform features user authentication, crypto wallet integration, real-time balance management, and multiple betting games including Coin Flip, Roulette, Skyscraper (Tower), Crash, Dice, and Mines.

The application is built as a monorepo with a React frontend and Express backend, utilizing in-memory storage for development and configured for PostgreSQL database integration via Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing

**UI Component System**
- Shadcn UI component library with Radix UI primitives for accessible, customizable components
- TailwindCSS for utility-first styling with custom theme configuration
- CSS variables for dynamic theming with dark mode support
- Framer Motion for animations and transitions

**State Management**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- React Context API for authentication state (AuthContext)
- Local storage for JWT token persistence

**Form Handling**
- React Hook Form for performant form management with minimal re-renders
- Zod for schema validation integrated via @hookform/resolvers
- Shared validation schemas between frontend and backend

### Backend Architecture

**Server Framework**
- Express.js for REST API endpoints
- TypeScript for type safety across the stack
- Custom middleware for request logging and error handling

**Authentication & Security**
- JWT (JSON Web Tokens) for stateless authentication
- bcryptjs for password hashing
- Token-based authentication middleware protecting all game and transaction endpoints

**Game Logic**
- Coin Flip: 50/50 probability with 2x payout
- Roulette: European-style (0-36) with multiple bet types (red/black, odd/even, specific numbers)
- Tower (Skyscraper): Progressive multiplier game with difficulty levels
- Crash: Multiplier-based game with real-time status tracking
- Dice: Roll-based betting with configurable target and direction
- Mines: Grid-based game with configurable mine count and progressive multipliers

**Session Management**
- In-memory storage implementation (MemStorage) for development
- Structured storage interface (IStorage) allowing easy migration to persistent databases

### Data Storage

**Database Design**
- Drizzle ORM configured for PostgreSQL with type-safe schema definitions
- Schema includes:
  - Users: Authentication and wallet address management
  - Balances: User cryptocurrency balances (USDT)
  - Deposits: Deposit transaction tracking with status management
  - Bets: Game betting history with outcomes and payouts
  - Transactions: Unified transaction ledger for all financial activities

**Current Storage Strategy**
- Development: In-memory Map-based storage for rapid iteration
- Production-ready: PostgreSQL schema defined and migration-ready via Drizzle Kit
- All storage operations abstracted behind IStorage interface for flexibility

### API Architecture

**Endpoint Structure**
- `/api/register` - User registration with automatic wallet generation
- `/api/login` - JWT-based authentication
- `/api/balance` - User balance retrieval (authenticated)
- `/api/wallet-address` - User's deposit wallet address
- `/api/deposit` - Create deposit requests
- `/api/deposits` - Retrieve user deposit history
- `/api/bet` - Place bets on Coin Flip and Roulette
- `/api/[game]/play` - Game-specific betting endpoints (Crash, Dice, Mines)
- `/api/[game]/status` - Active game status tracking
- `/api/transactions` - Complete transaction history

**Authentication Flow**
1. User registers with username, email, and password
2. Server generates unique wallet address for deposits
3. Password is hashed with bcryptjs
4. JWT token issued upon successful login
5. Token included in Authorization header for protected endpoints
6. Middleware validates token and attaches userId to requests

### External Dependencies

**Core Runtime**
- Node.js with ES Modules
- TypeScript for compile-time type checking

**Database & ORM**
- PostgreSQL (configured via DATABASE_URL environment variable)
- Drizzle ORM for type-safe database operations
- @neondatabase/serverless for serverless PostgreSQL connections

**UI Libraries**
- Radix UI component primitives (30+ components)
- Framer Motion for animations
- Lucide React for icons

**Development Tools**
- tsx for TypeScript execution in development
- esbuild for server-side bundling
- Vite plugins for Replit integration (cartographer, dev-banner, runtime-error-modal)

**Notable Design Decisions**
- Server clears all user data on startup (development behavior)
- Wallet addresses are generated as deterministic hashes of user IDs (mock implementation)
- Game outcomes use Math.random() for probability (suitable for demo, not production gambling)
- All financial values stored as decimal strings to prevent floating-point precision issues
- Shared schema definitions between frontend and backend prevent API contract mismatches
