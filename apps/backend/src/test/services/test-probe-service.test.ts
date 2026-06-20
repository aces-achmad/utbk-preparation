import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { TestProbeRepository } from "../../modules/test-support/repositories/test-probe-repository";
import { TestProbeService } from "../../modules/test-support/services/test-probe-service";

describe("TestProbeService", () => {
  it("normalizes labels before storing them", async () => {
    const pool = await getTestPool();
    const repository = new TestProbeRepository(pool);
    const service = new TestProbeService(repository, testLogger);

    await service.recordProbe("  package-validity  ");

    const records = await repository.list();

    expect(records).toHaveLength(1);
    expect(records[0]?.label).toBe("package-validity");
  });

  it("rejects empty labels", async () => {
    const pool = await getTestPool();
    const repository = new TestProbeRepository(pool);
    const service = new TestProbeService(repository, testLogger);

    await expect(service.recordProbe("   ")).rejects.toThrow("Probe label must not be empty.");
  });
});

