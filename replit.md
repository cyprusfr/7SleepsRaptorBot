# Raptor Bot Dashboard Project

## Overview
Discord bot management system with Google OAuth authentication and comprehensive license key management. The system features a professional Discord bot with 40+ commands for license key administration, payment processing, user management, and system monitoring.

## Project Architecture

### Authentication System
- Google OAuth integration for web dashboard access
- Discord verification system for bot interactions
- Session-based authentication with PostgreSQL storage
- Role-based access control (admin, approved users)

### Database Schema
- Users table for authenticated web users
- Discord users table for bot user management
- License keys table with metadata and HWID tracking
- Activity logs for comprehensive audit trails
- Backup integrity tracking system

### Discord Bot Features
- **License Key Management**: Create, validate, transfer, and monitor keys
- **Payment Processing**: Generate keys for Bitcoin, Ethereum, PayPal, CashApp, Venmo, Robux
- **User Administration**: Whitelist management, user information lookup
- **HWID Tracking**: Hardware ID management and key linking
- **Activity Logging**: Comprehensive audit trails for all operations
- **Suggestion System**: Community feedback and approval workflow
- **Moderation Tools**: User management, role assignment, server administration

### Frontend Dashboard
- React-based interface with Shadcn UI components
- Real-time data display for keys, users, and activities
- Responsive design with dark/light theme support
- Protected routes requiring authentication

## Recent Changes

### December 13, 2025
- **Complete Discord Bot Command Implementation**: Added full database functionality to all 40+ commands
- **Payment Key Generation**: Implemented real database storage for Bitcoin, Ethereum, PayPal, CashApp, Venmo, Robux keys
- **HWID Management**: Added comprehensive hardware ID tracking and key association
- **Activity Logging**: Implemented detailed audit trails for all operations
- **User Management**: Added whitelist functionality with database updates
- **Log Management**: Created user log system with add/remove/view capabilities
- **Transfer System**: Implemented key ownership transfer with validation

### Current Implementation Status
- ✅ Authentication flow and dashboard navigation
- ✅ Complete Discord bot command set with database operations
- ✅ License key management with real validation
- ✅ Payment key generation with metadata storage
- ✅ HWID tracking and user association
- ✅ Activity logging for audit trails
- ✅ User administration and whitelist management
- ✅ Comprehensive error handling and validation

## User Preferences
- Professional Discord bot commands replacing gaming-focused features
- Complete database integration over placeholder responses
- Comprehensive audit logging for all administrative actions
- Real-time validation and error handling
- Rich Discord embed responses with detailed information

## Technical Stack
- **Backend**: Express.js with TypeScript
- **Frontend**: React with Wouter routing
- **Database**: PostgreSQL with Drizzle ORM
- **Bot Framework**: Discord.js
- **UI Library**: Shadcn UI with Tailwind CSS
- **Authentication**: Google OAuth with OpenID Connect

## Key Features Implemented
1. **Discord Bot Commands** (40+ commands with database logic)
   - License key management (add, keyinfo, transfer)
   - Payment key generation (multiple payment methods)
   - User administration (whitelist, userinfo, hwidinfo)
   - System tools (backup, restore, ping, eval)
   - Moderation features (purge, timeout, announcement)

2. **Database Operations**
   - Real-time key validation and status updates
   - HWID tracking and association
   - User metadata management
   - Activity logging with detailed audit trails

3. **Security Features**
   - Permission-based command access
   - Rate limiting for bot operations
   - Secure key generation and storage
   - Comprehensive input validation