import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByCategories,
    getGamesByPublishers,
    getGamesByFilters,
    getAllCategories,
    getAllPublishers,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedGamesWithMultipleCategoriesAndPublishers(db: Database): Promise<{
    categoryIds: number[];
    publisherIds: number[];
}> {
    const [cat1] = await db
        .insert(categories)
        .values({ name: 'Action', description: 'Action games' })
        .returning({ id: categories.id });
    const [cat2] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'Strategy games' })
        .returning({ id: categories.id });
    const [pub1] = await db
        .insert(publishers)
        .values({ name: 'Publisher A', description: 'pub a' })
        .returning({ id: publishers.id });
    const [pub2] = await db
        .insert(publishers)
        .values({ name: 'Publisher B', description: 'pub b' })
        .returning({ id: publishers.id });

    // Action games from Publisher A
    await db.insert(games).values({
        title: 'Action Game 1',
        description: 'An action game',
        starRating: 4.5,
        categoryId: cat1.id,
        publisherId: pub1.id,
    });

    // Action games from Publisher B
    await db.insert(games).values({
        title: 'Action Game 2',
        description: 'Another action game',
        starRating: 4.0,
        categoryId: cat1.id,
        publisherId: pub2.id,
    });

    // Strategy games from Publisher A
    await db.insert(games).values({
        title: 'Strategy Game 1',
        description: 'A strategy game',
        starRating: 4.8,
        categoryId: cat2.id,
        publisherId: pub1.id,
    });

    // Strategy games from Publisher B
    await db.insert(games).values({
        title: 'Strategy Game 2',
        description: 'Another strategy game',
        starRating: 3.9,
        categoryId: cat2.id,
        publisherId: pub2.id,
    });

    return { categoryIds: [cat1.id, cat2.id], publisherIds: [pub1.id, pub2.id] };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by a single category', async () => {
        const { categoryIds } = await seedGamesWithMultipleCategoriesAndPublishers(db);
        const actionGames = await getGamesByCategories(db, [categoryIds[0]]);
        expect(actionGames.map((g) => g.title)).toEqual(['Action Game 1', 'Action Game 2']);
    });

    it('filters games by multiple categories', async () => {
        const { categoryIds } = await seedGamesWithMultipleCategoriesAndPublishers(db);
        const allGames = await getGamesByCategories(db, categoryIds);
        expect(allGames.map((g) => g.title)).toEqual([
            'Action Game 1',
            'Action Game 2',
            'Strategy Game 1',
            'Strategy Game 2',
        ]);
    });

    it('returns empty array when filtering by non-existent category', async () => {
        await seedGamesWithMultipleCategoriesAndPublishers(db);
        const games = await getGamesByCategories(db, [99999]);
        expect(games).toEqual([]);
    });

    it('filters games by a single publisher', async () => {
        const { publisherIds } = await seedGamesWithMultipleCategoriesAndPublishers(db);
        const pub1Games = await getGamesByPublishers(db, [publisherIds[0]]);
        expect(pub1Games.map((g) => g.title)).toEqual(['Action Game 1', 'Strategy Game 1']);
    });

    it('filters games by multiple publishers', async () => {
        const { publisherIds } = await seedGamesWithMultipleCategoriesAndPublishers(db);
        const allGames = await getGamesByPublishers(db, publisherIds);
        expect(allGames.map((g) => g.title)).toEqual([
            'Action Game 1',
            'Action Game 2',
            'Strategy Game 1',
            'Strategy Game 2',
        ]);
    });

    it('returns empty array when filtering by non-existent publisher', async () => {
        await seedGamesWithMultipleCategoriesAndPublishers(db);
        const games = await getGamesByPublishers(db, [99999]);
        expect(games).toEqual([]);
    });

    it('filters games by category and publisher combined', async () => {
        const { categoryIds, publisherIds } = await seedGamesWithMultipleCategoriesAndPublishers(db);
        const games = await getGamesByFilters(db, [categoryIds[0]], [publisherIds[0]]);
        expect(games.map((g) => g.title)).toEqual(['Action Game 1']);
    });

    it('returns all games when filters are empty', async () => {
        const _result = await seedGamesWithMultipleCategoriesAndPublishers(db);
        const allGames = await getGamesByFilters(db, [], []);
        expect(allGames.length).toBe(4);
    });

    it('returns all categories ordered by name', async () => {
        await seedGamesWithMultipleCategoriesAndPublishers(db);
        const allCats = await getAllCategories(db);
        expect(allCats.map((c) => c.name)).toEqual(['Action', 'Strategy']);
    });

    it('returns all publishers ordered by name', async () => {
        await seedGamesWithMultipleCategoriesAndPublishers(db);
        const allPubs = await getAllPublishers(db);
        expect(allPubs.map((p) => p.name)).toEqual(['Publisher A', 'Publisher B']);
    });
});
