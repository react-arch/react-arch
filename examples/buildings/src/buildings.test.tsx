import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToDocument } from "@react-arch/react";
import { allFloors } from "@react-arch/core";
import { validateDocument } from "@react-arch/validation";
import { Apartment } from "./Apartment.js";
import { ModernHouse } from "./ModernHouse.js";
import { ProgrammaticBlock } from "./ProgrammaticBlock.js";
import { SimpleRoom } from "./SimpleRoom.js";

const cases: [string, ComponentType][] = [
  ["SimpleRoom", SimpleRoom],
  ["ModernHouse", ModernHouse],
  ["Apartment", Apartment],
  ["ProgrammaticBlock", ProgrammaticBlock],
];

describe("example buildings render to valid models", () => {
  for (const [name, Comp] of cases) {
    it(`${name} produces a valid document with no errors`, () => {
      const doc = renderToDocument(createElement(Comp));
      const floors = allFloors(doc);
      expect(floors.length).toBeGreaterThan(0);
      expect(floors.some((f) => f.rooms.length > 0)).toBe(true);
      const errors = validateDocument(doc).filter((d) => d.severity === "error");
      expect(errors).toEqual([]);
    });
  }

  it("ModernHouse has two floors", () => {
    const doc = renderToDocument(createElement(ModernHouse));
    expect(allFloors(doc)).toHaveLength(2);
  });

  it("ProgrammaticBlock generates 3 floors via a loop", () => {
    const doc = renderToDocument(createElement(ProgrammaticBlock));
    expect(allFloors(doc)).toHaveLength(3);
  });
});
