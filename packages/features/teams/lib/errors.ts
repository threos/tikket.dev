// Sentinels thrown by the teams repositories from inside a transaction so the write is rolled back;
// the services translate them into user-facing ErrorWithCode messages.

export class TeamOwnerMinimumError extends Error {
  constructor() {
    super("The team would be left without enough accepted owners");
    this.name = "TeamOwnerMinimumError";
  }
}

export class TeamSlugTakenError extends Error {
  constructor() {
    super("The team slug is already taken");
    this.name = "TeamSlugTakenError";
  }
}
