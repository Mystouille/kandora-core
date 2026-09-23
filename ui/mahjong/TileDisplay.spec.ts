import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InteractiveHandDisplay } from "./TileDisplay";
import { TileSetName } from "./handLayout";

function renderCalledPon(tileSet: TileSetName): string {
  return renderToStaticMarkup(
    createElement(InteractiveHandDisplay, {
      hand: "678999p1299s 9'99m",
      selectedIndex: null,
      disabled: false,
      answering: true,
      onTileClick: () => {},
      tileSet,
    })
  );
}

describe("InteractiveHandDisplay called tiles", () => {
  it("rotates an upright Uzaku sprite for the called tile", () => {
    expect(renderCalledPon(TileSetName.Uzaku)).toContain("rotate(90deg)");
  });

  it("keeps Trainer's dedicated called sprite unrotated", () => {
    expect(renderCalledPon(TileSetName.Trainer)).not.toContain("rotate(90deg)");
  });
});
