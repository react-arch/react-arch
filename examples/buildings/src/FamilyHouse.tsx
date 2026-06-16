import { Building, Door, Floor, Roof, Room, Stairs, Window, Fixture } from "@react-arch/react";

/**
 * A deeper, two-storey family house on a 12 × 9 m footprint with a central
 * circulation spine. Rooms tile the plan, share walls, connect to the hall via
 * doors, and have exterior windows + furniture. A good stress test for wall
 * merging, room grouping, the 3D render, and the agent validation checks.
 *
 * Coordinates are metres; X increases right, Y increases down.
 */
export function FamilyHouse() {
  return (
    <Building name="Family House" units="metric">
      {/* ── Ground floor: living spaces around a central hall ── */}
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.9}>
        {/* Central circulation spine + front door */}
        <Room id="g-hall" name="Entry Hall" x={5} y={0} width={2} depth={9} usage="hallway">
          <Door wall="south" offset={1} width={1.0} height={2.2} />
        </Room>

        {/* Straight flight in the hall, climbing north to the first-floor landing. */}
        <Stairs at={[5.5, 4.5]} direction="north" width={1} run={3.5} steps={16} />


        <Room id="living" name="Living Room" x={0} y={0} width={5} depth={5} usage="living">
          <Door wall="east" offset={2.5} width={0.9} height={2.1} />
          <Window wall="west" offset={2.5} width={2.2} height={1.5} />
          <Window wall="north" offset={2.5} width={1.8} height={1.5} />
          <Fixture type="sofa" x={1.4} y={4.2} scaleX={1.3} />
          <Fixture type="table" x={2.5} y={2.4} />
          <Fixture type="chair" x={3.6} y={1.2} />
        </Room>

        <Room id="dining" name="Dining" x={0} y={5} width={5} depth={4} usage="dining">
          <Door wall="east" offset={2} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={1.6} height={1.5} />
          <Window wall="south" offset={2.5} width={1.8} height={1.5} />
          <Fixture type="table" x={2.5} y={7} scaleX={1.6} scaleY={1.2} />
          <Fixture type="chair" x={1.4} y={6.2} />
          <Fixture type="chair" x={3.6} y={7.8} />
        </Room>

        <Room id="kitchen" name="Kitchen" x={7} y={0} width={5} depth={5} usage="kitchen">
          <Door wall="west" offset={2.5} width={0.9} height={2.1} />
          <Window wall="east" offset={2.5} width={1.8} height={1.5} />
          <Window wall="north" offset={2.5} width={1.6} height={1.5} />
          <Fixture type="kitchen counter" x={9.5} y={0.5} scaleX={3.5} />
          <Fixture type="sink" x={8.4} y={0.6} />
        </Room>

        <Room id="garage" name="Garage" x={7} y={5} width={5} depth={4} usage="garage">
          <Door wall="west" offset={2} width={0.9} height={2.1} />
          <Door wall="south" offset={2.5} width={2.4} height={2.2} />
        </Room>
      </Floor>

      {/* ── First floor: sleeping + work around a landing ── */}
      <Floor id="first" name="First Floor" elevation={2.9} height={2.8}>
        <Room id="landing" name="Landing" x={5} y={0} width={2} depth={5} usage="hallway">
          <Window wall="north" offset={1} width={1.0} height={1.2} />
        </Room>

        <Room id="master" name="Master Bedroom" x={0} y={0} width={5} depth={5} usage="sleeping">
          <Door wall="east" offset={2.5} width={0.9} height={2.1} />
          <Window wall="west" offset={2.5} width={2.2} height={1.4} />
          <Window wall="north" offset={2.5} width={1.8} height={1.4} />
          <Fixture type="bed" x={2.5} y={1.6} scaleX={1.7} scaleY={2} />
          <Fixture type="wardrobe" x={0.7} y={4} scaleX={1.4} />
        </Room>

        <Room id="bed-2" name="Bedroom 2" x={0} y={5} width={5} depth={4} usage="sleeping">
          <Door wall="east" offset={2} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={1.8} height={1.4} />
          <Window wall="south" offset={2.5} width={1.6} height={1.4} />
          <Fixture type="bed" x={2.2} y={6.6} scaleX={1.4} scaleY={2} />
        </Room>

        <Room id="bath" name="Bathroom" x={5} y={5} width={2} depth={4} usage="wet">
          <Door wall="north" offset={1} width={0.8} height={2.1} />
          <Window wall="south" offset={1} width={0.8} height={1.0} />
          <Fixture type="toilet" x={5.5} y={8.4} />
          <Fixture type="sink" x={6.5} y={8.4} />
          <Fixture type="shower" x={5.9} y={6} />
        </Room>

        <Room id="bed-3" name="Bedroom 3" x={7} y={0} width={5} depth={5} usage="sleeping">
          <Door wall="west" offset={2.5} width={0.9} height={2.1} />
          <Window wall="east" offset={2.5} width={2.2} height={1.4} />
          <Window wall="north" offset={2.5} width={1.8} height={1.4} />
          <Fixture type="bed" x={9.5} y={1.6} scaleX={1.4} scaleY={2} />
        </Room>

        <Room id="office" name="Office" x={7} y={5} width={5} depth={4} usage="office">
          <Door wall="west" offset={2} width={0.9} height={2.1} />
          <Window wall="east" offset={2} width={1.8} height={1.4} />
          <Window wall="south" offset={2.5} width={1.6} height={1.4} />
          <Fixture type="desk" x={9.5} y={5.6} scaleX={1.2} />
          <Fixture type="chair" x={9.5} y={6.4} />
        </Room>
      </Floor>

      <Roof type="hip" pitch={35} overhang={0.4} />
    </Building>
  );
}
