# Recipe Organizer

A recipe management single-page app with weekly meal planning, grocery-list generation, and nutrition lookup.

Originally built for an INFO5100 (Application Engineering and Development) hackathon.

## Features

- **Recipe library** — create, edit, and browse recipes (`RecipeForm`, `RecipeLibrary`, `RecipeDetail`)
- **Cuisine explorer** — browse recipes by cuisine (`CuisineExplorer`)
- **Weekly meal planner** with drag-and-drop scheduling (`MealPlanner`, `@dnd-kit`)
- **Grocery list** auto-generated from planned meals, with unit conversion (`GroceryList`, `unitConverter.ts`)
- **Nutrition lookup** via a small Express backend that proxies the Spoonacular API, with a local JSON cache (`server/src/routes/nutrition.ts`)
- **i18n** — English, Spanish, and Chinese (`src/i18n`, `LanguageSwitcher`)
- Local persistence via Zustand stores (`recipeStore`, `mealPlanStore`, `settingsStore`)

## Tech stack

- Frontend: React 19 + TypeScript + Vite, Tailwind CSS, Zustand, react-i18next
- Backend: Express (TypeScript), simple file-based nutrition cache
- PWA-ready via `vite-plugin-pwa`

## Running locally

**Frontend**

```bash
npm install
npm run dev
```

**Backend** (needed for nutrition lookups)

```bash
cd server
npm install
cp .env.example .env   # add your SPOONACULAR_API_KEY
npm run dev
```

The frontend runs on Vite's default port; the API server runs on `http://localhost:3001` (see `server/.env.example`).

## Project structure

```
src/
  components/   UI components (recipe forms, meal planner, grocery list, settings, ...)
  store/        Zustand state stores
  lib/          Utilities (unit conversion, grocery list generation, seed data)
  i18n/         Translations (en, es, zh)
server/
  src/routes/   Express API routes (nutrition lookup + cache)
```
