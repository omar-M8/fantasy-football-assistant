"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sleeperClient } from "@/lib/sleeper-client";
import {
  backToDemoWith,
  selectTeamWith,
  submitLeagueIdWith,
  type ActionDeps,
} from "@/lib/league-selection";
import type { LeagueFormState } from "@/lib/league-form";

/**
 * Server actions for choosing whose team the app shows. The logic lives in
 * src/lib/league-selection.ts (tested there); these only supply Next's cookies and redirect.
 */

async function deps(): Promise<ActionDeps> {
  return { dataSource: sleeperClient, cookies: await cookies(), redirect };
}

export async function submitLeagueId(
  previous: LeagueFormState,
  formData: FormData
): Promise<LeagueFormState> {
  return submitLeagueIdWith(await deps(), previous, formData);
}

export async function selectTeam(formData: FormData): Promise<void> {
  await selectTeamWith(await deps(), formData);
}

export async function backToDemo(): Promise<void> {
  backToDemoWith(await deps());
}
