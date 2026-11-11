/**
 * Thrown by a FantasyDataSource when the thing asked for doesn't exist (e.g. an unknown
 * league ID), so callers can tell "not found" apart from "the source is down".
 */
export class DataSourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSourceNotFoundError";
  }
}
