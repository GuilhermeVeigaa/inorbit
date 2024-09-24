import { count } from "drizzle-orm";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import { gte, lte, and, eq, sql } from "drizzle-orm";
import dayjs from "dayjs";

interface createGoalCompletionRequest {
	goalId: string;
}

export async function createGoalCompletion({
	goalId,
}: createGoalCompletionRequest) {
	const firstDayOfWeek = dayjs().startOf("week").toDate();
	const lastDayOfWeek = dayjs().endOf("week").toDate();

	const goalsCompletionCounts = db.$with("goals_completion_count").as(
		db
			.select({
				goalId: goalCompletions.goalId,
				completionCount: count(goalCompletions.id).as("completionCount"),
			})
			.from(goalCompletions)
			.where(
				and(
					gte(goalCompletions.createdAt, firstDayOfWeek),
					lte(goalCompletions.createdAt, lastDayOfWeek),
					eq(goalCompletions.goalId, goalId),
				),
			)
			.groupBy(goalCompletions.goalId),
	);

	const result = await db
		.with(goalsCompletionCounts)
		.select({
			desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
			completionCount: sql /*sql*/`
				COALESCE(${goalsCompletionCounts.completionCount}, 0)
			`.mapWith(Number),
		})
		.from(goals)
		.leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goals.id))
		.where(eq(goals.id, goalId))
		.limit(1);

	const { completionCount, desiredWeeklyFrequency } = result[0];

    if (completionCount >= desiredWeeklyFrequency) {
        throw new Error("Goals already completed this week!")
    }

	const insertResult = await db
		.insert(goalCompletions)
		.values({ goalId })
		.returning();

	const goalCompletion = insertResult[0];

	return {
		goalCompletion,
	};
}
