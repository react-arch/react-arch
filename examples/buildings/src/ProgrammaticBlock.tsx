import { Building, Door, Floor, Room, Window } from "@react-arch/react";
import { StandardBathroom } from "./modules.js";

interface Unit {
  id: string;
  x: number;
  y: number;
}

function ApartmentModule({ id, x, y }: Unit) {
  return (
    <>
      <Room id={`${id}-living`} name={`${id} Living`} x={x} y={y} width={4} depth={4}>
        <Door wall="south" offset={1} width={0.9} />
        <Window wall="north" offset={2} width={1.8} height={1.4} />
      </Room>
      <StandardBathroom id={`${id}-bath`} x={x + 4} y={y} />
    </>
  );
}

/**
 * Why React Arch is different: generate a whole apartment block with a loop.
 * Three floors, three units each — described in a few lines of code.
 */
export function ProgrammaticBlock() {
  const floors = [0, 1, 2];
  const units: Unit[] = [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 7, y: 0 },
    { id: "C", x: 14, y: 0 },
  ];
  return (
    <Building name="Apartment Block" units="metric">
      {floors.map((level) => (
        <Floor key={level} id={`level-${level}`} name={`Level ${level + 1}`} elevation={level * 3} height={2.9}>
          {units.map((u) => (
            <ApartmentModule key={u.id} id={`L${level}-${u.id}`} x={u.x} y={u.y} />
          ))}
        </Floor>
      ))}
    </Building>
  );
}
