import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToDocument } from "@react-arch/react";
import { allFloors } from "@react-arch/core";
import { validateDocument, review } from "@react-arch/validation";
import { Apartment } from "./Apartment.js";
import { ModernHouse } from "./ModernHouse.js";
import { FamilyHouse } from "./FamilyHouse.js";
import { ProgrammaticBlock } from "./ProgrammaticBlock.js";
import { SimpleRoom } from "./SimpleRoom.js";

const cases: [string, ComponentType][] = [
  ["SimpleRoom", SimpleRoom],
  ["ModernHouse", ModernHouse],
  ["FamilyHouse", FamilyHouse],
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

  it("FamilyHouse passes the full review with no errors or warnings", () => {
    const doc = renderToDocument(createElement(FamilyHouse));
    expect(allFloors(doc)).toHaveLength(2);
    expect(allFloors(doc).reduce((s, f) => s + f.rooms.length, 0)).toBe(11);
    const r = review(doc);
    const blocking = r.diagnostics.filter((d) => d.severity !== "info");
    expect(blocking).toEqual([]);
  });

  it("captures fixtures declared inside rooms (e.g. StandardBathroom)", () => {
    const doc = renderToDocument(createElement(ModernHouse));
    const objects = allFloors(doc).flatMap((f) => f.objects);
    expect(objects.length).toBeGreaterThan(0);
    expect(objects.map((o) => o.type)).toContain("toilet");
  });
});
