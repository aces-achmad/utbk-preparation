import type { Logger } from "../../../lib/logger";
import { TestProbeRepository } from "../repositories/test-probe-repository";

export class TestProbeService {
  constructor(
    private readonly repository: TestProbeRepository,
    private readonly logger: Logger,
  ) {}

  async recordProbe(label: string) {
    const normalizedLabel = label.trim();

    if (normalizedLabel.length === 0) {
      throw new Error("Probe label must not be empty.");
    }

    const id = await this.repository.create(normalizedLabel);

    this.logger.info("test_probe.recorded", {
      probeId: id,
      label: normalizedLabel,
    });

    return id;
  }
}

