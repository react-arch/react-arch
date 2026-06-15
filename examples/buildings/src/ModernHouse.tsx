import { Building, Door, Floor, Room, Window } from "@react-arch/react";
import { BedroomModule, StandardBathroom } from "./modules.js";

/**
 * A two-storey house. This is the sample the Studio opens with. Edit any value
 * here and the Studio's 2D / 3D / JSON views update live.
 */
export function ModernHouse() {
  return (
    <Building name="Modern House" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="living" name="Living Room" x={0} y={0} width={5} depth={4}>
          <Door wall="south" offset={1} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.2} height={1.4} />
          <Window wall="north" offset={2.5} width={1.8} height={1.4} />
        </Room>

        <Room id="kitchen" name="Kitchen" x={5} y={0} width={4} depth={4}>
          <Window wall="north" offset={2} width={1.6} height={1.4} />
          <Door wall="west" offset={2} width={0.9} />
        </Room>

        <Room id="entry" name="Entry" x={0} y={4} width={3} depth={2.5}>
          <Door wall="south" offset={1.5} width={1.0} height={2.2} />
        </Room>

        <StandardBathroom id="wc" x={3} y={4} />
      </Floor>

      <Floor id="first" name="First Floor" elevation={2.8} height={2.7}>
        <BedroomModule id="bed-main" name="Main Bedroom" x={0} y={0} width={5} depth={4} />
        <BedroomModule id="bed-2" name="Bedroom 2" x={5} y={0} width={4} depth={4} />
        <StandardBathroom id="bath-1" x={5} y={4} />
      </Floor>
    </Building>
  );
}
