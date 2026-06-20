import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { TestProbeRepository } from "../../modules/test-support/repositories/test-probe-repository";

describe("TestProbeRepository", () => {
  it("persists and lists probe records in MySQL", async () => {
    const pool = await getTestPool();
    const repository = new TestProbeRepository(pool);

    await repository.create("import-preview");
    await repository.create("attempt-submit");

    const records = await repository.list();

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.label)).toEqual(["import-preview", "attempt-submit"]);
  });
});

