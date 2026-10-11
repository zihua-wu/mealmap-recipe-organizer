import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { RecipeDetail } from '@/components/RecipeDetail';
import { RecipeFormPage } from '@/components/RecipeForm';
import { MealPlanner } from '@/components/MealPlanner';
import { GroceryList } from '@/components/GroceryList';
import { CuisineExplorer } from '@/components/CuisineExplorer';
import { Settings } from '@/components/Settings';
import { useRecipeStore } from '@/store/recipeStore';
import { SEED_RECIPES } from '@/lib/seedData';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <RecipeLibrary /> },
      { path: 'recipes/new', element: <RecipeFormPage /> },
      { path: 'recipes/:id', element: <RecipeDetail /> },
      { path: 'recipes/:id/edit', element: <RecipeFormPage /> },
      { path: 'meal-planner', element: <MealPlanner /> },
      { path: 'grocery', element: <GroceryList /> },
      { path: 'explore', element: <CuisineExplorer /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

function SeedLoader() {
  useEffect(() => {
    // Read live Zustand state (not stale React closure) to survive StrictMode double-invoke.
    const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipeStore.getState();

    const seedByTitle = new Map(SEED_RECIPES.map((s) => [s.title, s]));
    const existingTitles = new Set(recipes.map((r) => r.title));

    // 1. Remove duplicates — keep only the first occurrence of each title.
    const seen = new Set<string>();
    for (const r of recipes) {
      if (seen.has(r.title)) {
        deleteRecipe(r.id);
      } else {
        seen.add(r.title);
      }
    }

    // 2. Add any seed recipes that are missing entirely.
    for (const seed of SEED_RECIPES) {
      if (!existingTitles.has(seed.title)) {
        addRecipe({
          title: seed.title,
          description: seed.description,
          cuisine: seed.cuisine,
          cookTimeMin: seed.cookTimeMin,
          servings: seed.servings,
          imageUrl: seed.imageUrl,
          ingredients: seed.ingredients,
          steps: seed.steps,
          tags: seed.tags,
        });
      }
    }

    // 3. Always sync seed recipe images (overwrites stale/broken URLs too).
    for (const r of useRecipeStore.getState().recipes) {
      const seed = seedByTitle.get(r.title);
      if (seed && r.imageUrl !== seed.imageUrl) {
        updateRecipe(r.id, { imageUrl: seed.imageUrl });
      }
    }
  }, []);

  return null;
}

export default function App() {
  return (
    <>
      <SeedLoader />
      <RouterProvider router={router} />
    </>
  );
}
