import { describe, expect, it } from "vitest";

import { parseMajsoulClientVersion } from "./MajsoulApi";

describe("parseMajsoulClientVersion", () => {
  it("reads the Unity product version from the live page configuration", () => {
    expect(
      parseMajsoulClientVersion(`
        createUnityInstance(canvas, {
          productName: "MahjongSoul",
          productVersion: "4.0.10",
        });
      `)
    ).toBe("WebGL_2022-4.0.10");
  });

  it("falls back to the Unity build filename", () => {
    expect(
      parseMajsoulClientVersion(
        'codeUrl: "Build/en-WebGL-release-4.0.10(11).wasm.gz"'
      )
    ).toBe("WebGL_2022-4.0.10");
  });

  it("rejects a page that does not expose a client version", () => {
    expect(() => parseMajsoulClientVersion("<html></html>")).toThrow(
      /Could not determine/
    );
  });
});
