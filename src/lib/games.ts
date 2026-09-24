import { eq, asc, inArray, and } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game, Category, Publisher } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** All games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

/**
 * Games filtered by one or more category IDs, ordered by title.
 * @param db - The injectable database client.
 * @param categoryIds - Array of category IDs to filter by.
 * @returns Array of games in the specified categories.
 */
export async function getGamesByCategories(db: Database, categoryIds: number[]): Promise<Game[]> {
    if (categoryIds.length === 0) return [];
    const rows = await baseGamesQuery(db)
        .where(inArray(games.categoryId, categoryIds))
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Games filtered by one or more publisher IDs, ordered by title.
 * @param db - The injectable database client.
 * @param publisherIds - Array of publisher IDs to filter by.
 * @returns Array of games from the specified publishers.
 */
export async function getGamesByPublishers(db: Database, publisherIds: number[]): Promise<Game[]> {
    if (publisherIds.length === 0) return [];
    const rows = await baseGamesQuery(db)
        .where(inArray(games.publisherId, publisherIds))
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Games filtered by one or more category IDs and one or more publisher IDs, ordered by title.
 * @param db - The injectable database client.
 * @param categoryIds - Array of category IDs to filter by.
 * @param publisherIds - Array of publisher IDs to filter by.
 * @returns Array of games matching all filter criteria.
 */
export async function getGamesByFilters(
    db: Database,
    categoryIds: number[],
    publisherIds: number[],
): Promise<Game[]> {
    if (categoryIds.length === 0 && publisherIds.length === 0) {
        return getAllGames(db);
    }

    const conditions = [];

    if (categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, categoryIds));
    }

    if (publisherIds.length > 0) {
        conditions.push(inArray(games.publisherId, publisherIds));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const rows = await baseGamesQuery(db)
        .where(whereClause)
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * All categories ordered by name.
 * @param db - The injectable database client.
 * @returns Array of all categories.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db.select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
    return rows;
}

/**
 * All publishers ordered by name.
 * @param db - The injectable database client.
 * @returns Array of all publishers.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db.select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
    return rows;
}
