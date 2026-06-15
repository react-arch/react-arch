import { Building, Door, Floor, Room, Window } from "@react-arch/react";
import { KitchenModule, StandardBathroom } from "./modules.js";

/** A single-floor apartment: connected living spaces. */
export function Apartment() {
  return (
    <Building name="Apartment" units="metric">
      <Floor id="flat" name="Apartment" elevation={0} height={2.7}>
        <Room id="living" name="Living / Dining" x={0} y={0} width={6} depth={4.5}>
          <Window wall="south" offset={3} width={2.6} height={1.5} />
          <Door wall="east" offset={2} width={0.9} />
        </Room>

        <KitchenModule id="kitchen" x={6} y={0} width={3.5} depth={3} />

        <Room id="hall" name="Hallway" x={6} y={3} width={3.5} depth={1.5}>
          <Door wall="south" offset={1.75} width={1.0} />
        </Room>

        <Room id="bedroom" name="Bedroom" x={6} y={4.5} width={3.5} depth={3.5}>
          <Door wall="north" offset={1.75} width={0.9} />
          <Window wall="east" offset={1.75} width={1.6} height={1.4} />
        </Room>

        <StandardBathroom id="bath" x={3.6} y={4.5} />
      </Floor>
    </Building>
  );
}
