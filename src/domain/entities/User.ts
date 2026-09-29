/**
 * A user in the fantasy football application.
 */
export type User = {
  readonly userId: string;
  readonly avatarId: string | null;
  readonly userName: string;
  readonly displayName: string;
};
