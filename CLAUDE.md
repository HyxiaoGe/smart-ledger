# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Smart Ledger MVP built with Next.js, Supabase, and TypeScript. It's a personal finance tracking application with features for recording transactions, viewing summaries, and AI-powered analysis.

## Code Architecture & Structure
- `/app` - Next.js 14 App Router structure with pages and components
  - `page.tsx` - Home page with financial summaries and charts
  - `add/page.tsx` - Form for adding new transactions
  - `records/page.tsx` - List view of transaction records
  - `api/` - API routes for AI analysis functionality
- `/components` - Reusable UI components
- `/lib` - Utility functions and configuration
- `/public` - Static assets
- `/supabase` - Supabase configuration and migrations
- `/types` - TypeScript type definitions

## Key Dependencies
- Next.js 14 with App Router
- Supabase for backend/database
- Tailwind CSS for styling
- Recharts for data visualization
- TypeScript for type safety

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Testing
Tests should be placed in a `tests/` directory mirroring the `app/` structure. Use Jest/React Testing Library for component tests and Supabase testing utilities for database interactions.

## Database Schema
The application uses Supabase with a `transactions` table containing:
- id: UUID
- type: 'income' or 'expense'
- category: string
- amount: numeric
- date: date
- note: text
- currency: string (e.g., 'CNY', 'USD')
- deleted_at: timestamp (for soft deletion)

## Configuration
Environment variables are stored in `.env.local` and should include:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- AI provider keys (e.g., DEEPSEEK_API_KEY)

## Coding Standards
- Use TypeScript with strict typing
- Follow functional component patterns with React Server Components where appropriate
- Use Tailwind CSS for styling with utility-first approach
- Maintain consistent error handling and loading states
- Use the existing component structure and naming conventions