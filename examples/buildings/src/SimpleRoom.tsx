import { Building, Door, Floor, Room, Window } from "@react-arch/react";

/** The smallest meaningful building: one room with a door and a window. */
export function SimpleRoom() {
  return (
    <Building name="Simple Room" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="room" name="Studio" x={0} y={0} width={5} depth={4}>
          <Door wall="south" offset={2.5} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.2} height={1.4} />
        </Room>
      </Floor>
    </Building>
  );
}
