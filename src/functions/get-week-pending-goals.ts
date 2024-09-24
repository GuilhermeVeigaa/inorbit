import dayjs from "dayjs";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import { count, lte, and, gte, eq, sql } from "drizzle-orm";

export async function getWeekPendingGoals() {
	const firstDayOfWeek = dayjs().startOf("week").toDate();
	const lastDayOfWeek = dayjs().endOf("week").toDate();

	const goalsCreateUpToWeek = db.$with("goals_create_up_to_week").as(
		db
			.select({
				id: goals.id,
				title: goals.title,
				desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
				createdAt: goals.createdAt,
			})
			.from(goals)
			.where(lte(goals.createdAt, lastDayOfWeek)),
	);

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
				),
			)
			.groupBy(goalCompletions.goalId),
	);

	const pendingGoals = await db
		.with(goalsCreateUpToWeek, goalsCompletionCounts)
		.select({
			id: goalsCreateUpToWeek.id,
			title: goalsCreateUpToWeek.title,
			desiredWeeklyFrequency: goalsCreateUpToWeek.desiredWeeklyFrequency,
			completionCount: sql /*sql*/`
				COALESCE(${goalsCompletionCounts.completionCount}, 0)
			`.mapWith(Number),
		})
		.from(goalsCreateUpToWeek)
		.leftJoin(
			goalsCompletionCounts,
			eq(goalsCompletionCounts.goalId, goalsCreateUpToWeek.id),
		);

	return {
		pendingGoals,
	};
}
