import { afterAll, beforeAll, beforeEach } from "vitest";

import { closeTestPool, getTestPool, resetDatabase } from "../lib/testing/test-database";

beforeAll(async () => {
  await getTestPool();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeTestPool();
});

