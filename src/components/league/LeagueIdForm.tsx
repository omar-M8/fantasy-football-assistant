"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * LeagueIdForm component that allows users to enter their Sleeper league ID and navigate to the matchups page.
 *
 * @returns {JSX.Element} A form element containing an input field for the league ID and a submit button.
 */
export function LeagueIdForm() {
  {
    /* Initialize the router and state for the league ID input value. */
  }
  const router = useRouter();
  const [value, setValue] = useState("");
  {
    /* Handle form submission by preventing default behavior, validating the input, setting a cookie, and navigating to the matchups page. */
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Prevent the default form submission behavior. eg. refreshing the page

    // Validate the input value and return early if it's empty or only whitespace.
    if (!value.trim()) {
      return;
    }

    // Set a cookie with the league ID and navigate to the matchups page.
    document.cookie = `league_id=${encodeURIComponent(value)}; path=/; max-age=31536000`;
    router.push("/matchups");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      {/* Input field for the league ID and a submit button. */}
      <div className="flex gap-2">
        <Input
          id="league-id"
          name="leagueId"
          placeholder="Enter your Sleeper league ID"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Sleeper league ID"
        />

        {/* Submit button for the form. */}
        <Button type="submit" variant="secondary">
          Try My League
        </Button>
      </div>

      {/* Instructional text for users to find their league ID in the Sleeper app URL. */}
      <p className="text-muted-foreground mt-2 text-xs">
        Find your league ID in the Sleeper app URL: sleeper.com/leagues/[ID]/team
      </p>
    </form>
  );
}
