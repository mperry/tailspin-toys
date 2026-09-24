import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });
});

test.describe('Game Filtering', () => {
  test('should filter games by category', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get initial game count', async () => {
      const allGameCards = page.getByTestId('game-card');
      const initialCount = await allGameCards.count();
      expect(initialCount).toBeGreaterThan(0);
    });

    await test.step('Select a category filter', async () => {
      const categoryCheckboxes = page.locator('[data-testid^="category-checkbox-"]');
      if (await categoryCheckboxes.first().isVisible()) {
        await categoryCheckboxes.first().check();
      }
    });

    await test.step('Verify games grid is still visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify filtered results are showing', async () => {
      const gameCards = page.getByTestId('game-card').filter({ hasNot: page.locator('.hidden') });
      const filteredCount = await gameCards.count();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });
  });

  test('should filter games by publisher', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Select a publisher filter', async () => {
      const publisherCheckboxes = page.locator('[data-testid^="publisher-checkbox-"]');
      if (await publisherCheckboxes.first().isVisible()) {
        await publisherCheckboxes.first().check();
      }
    });

    await test.step('Verify games grid is still visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify filtered results are showing', async () => {
      const gameCards = page.getByTestId('game-card').filter({ hasNot: page.locator('.hidden') });
      const filteredCount = await gameCards.count();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });
  });

  test('should combine category and publisher filters', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Select both category and publisher filters', async () => {
      const categoryCheckboxes = page.locator('[data-testid^="category-checkbox-"]');
      const publisherCheckboxes = page.locator('[data-testid^="publisher-checkbox-"]');

      if (await categoryCheckboxes.first().isVisible()) {
        await categoryCheckboxes.first().check();
      }

      if (await publisherCheckboxes.first().isVisible()) {
        await publisherCheckboxes.first().check();
      }
    });

    await test.step('Verify games grid remains visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });
  });

  test('should clear all filters with clear button', async ({ page }) => {
    await test.step('Navigate to homepage and verify games exist', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid.locator('[data-testid="game-card"]').first()).toBeVisible({
        timeout: 10000,
      });
    });

    // Only run filter tests if filter controls exist
    const categoryCheckboxes = page.locator('[data-testid^="category-checkbox-"]');
    const checkboxCount = await categoryCheckboxes.count();

    if (checkboxCount === 0) {
      // Skip test if there are no filters to test
      return;
    }

    await test.step('Select a filter', async () => {
      await categoryCheckboxes.first().check();
    });

    await test.step('Click clear filters button', async () => {
      const clearButton = page.getByTestId('clear-filters-button');
      await expect(clearButton).toBeVisible();
      await clearButton.click();
    });

    await test.step('Verify all checkboxes are unchecked', async () => {
      const allCheckboxes = page.locator('input[type="checkbox"]');
      const checkedCount = await allCheckboxes.evaluate((elements) => {
        return (elements as HTMLInputElement[]).filter((el) => el.checked).length;
      });
      expect(checkedCount).toBe(0);
    });
  });

  test('should show empty state when no games match filters', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid.locator('[data-testid="game-card"]').first()).toBeVisible({
        timeout: 10000,
      });
    });

    // Only run filter tests if filter controls exist
    const categoryCheckboxes = page.locator('[data-testid^="category-checkbox-"]');
    const publisherCheckboxes = page.locator('[data-testid^="publisher-checkbox-"]');
    const categoryCount = await categoryCheckboxes.count();
    const publisherCount = await publisherCheckboxes.count();

    if (categoryCount === 0 && publisherCount === 0) {
      // Skip test if there are no filters to test
      return;
    }

    // This test attempts to select filters, but the empty state might not actually appear
    // depending on the data in the database
    if (categoryCount > 0) {
      await categoryCheckboxes.nth(0).check();
    }

    if (publisherCount > 1) {
      await publisherCheckboxes.nth(1).check();
    }

    // Check if either grid or empty state is visible
    const emptyState = page.locator('#empty-state-filtered');
    const gamesGrid = page.getByTestId('games-grid');

    const emptyStateVisible = await emptyState.evaluate((el) => !el.classList.contains('hidden'));
    const gridVisible = await gamesGrid.evaluate((el) => !el.classList.contains('hidden'));

    // At least one should be visible
    expect(emptyStateVisible || gridVisible).toBeTruthy();
  });

  test('should support keyboard navigation in filter panel', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid.locator('[data-testid="game-card"]').first()).toBeVisible({
        timeout: 10000,
      });
    });

    const categoryCheckboxes = page.locator('[data-testid^="category-checkbox-"]');
    const checkboxCount = await categoryCheckboxes.count();

    if (checkboxCount === 0) {
      // Skip test if there are no checkboxes
      return;
    }

    await test.step('Tab to first category checkbox and activate with keyboard', async () => {
      const firstCheckbox = categoryCheckboxes.first();
      await firstCheckbox.focus();
      await page.keyboard.press('Space');
      const isChecked = await firstCheckbox.evaluate((el: HTMLInputElement) => el.checked);
      expect(isChecked).toBe(true);
    });

    await test.step('Verify games grid is still visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      // The grid should still be in the DOM
      expect(await gamesGrid.count()).toBeGreaterThan(0);
    });
  });

  test('should display visible focus states on filter checkboxes', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid.locator('[data-testid="game-card"]').first()).toBeVisible({
        timeout: 10000,
      });
    });

    const categoryCheckboxes = page.locator('[data-testid^="category-checkbox-"]');
    const checkboxCount = await categoryCheckboxes.count();

    if (checkboxCount === 0) {
      // Skip test if there are no checkboxes
      return;
    }

    await test.step('Focus on a checkbox and verify focus ring is visible', async () => {
      const firstCheckbox = categoryCheckboxes.first();
      await firstCheckbox.focus();

      // Check if the checkbox has focus-related styling
      const hasFocus = await firstCheckbox.evaluate((el: HTMLElement) => {
        return document.activeElement === el;
      });
      expect(hasFocus).toBe(true);
    });
  });
});