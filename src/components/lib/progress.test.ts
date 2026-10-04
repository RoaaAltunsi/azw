import { expect, test } from "vitest";
import { estimatedProgress, progressStage } from "./progress";

test("the estimate starts at 0, only rises, and never reaches 100", () => {
  expect(estimatedProgress(0)).toBe(0);
  expect(estimatedProgress(-5)).toBe(0);
  let last = 0;
  for (let ms = 0; ms <= 600_000; ms += 500) {
    const percent = estimatedProgress(ms);
    expect(percent).toBeGreaterThanOrEqual(last);
    last = percent;
  }
  expect(last).toBeLessThanOrEqual(95);
  expect(estimatedProgress(8000)).toBe(60);
});

test("the stage follows the order of the pipeline", () => {
  expect(progressStage(0)).toBe("progress.stage.extract");
  expect(progressStage(29)).toBe("progress.stage.extract");
  expect(progressStage(30)).toBe("progress.stage.match");
  expect(progressStage(70)).toBe("progress.stage.compare");
  expect(progressStage(95)).toBe("progress.stage.compare");
});
