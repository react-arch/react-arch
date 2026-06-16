import { Composition } from "@react-arch/react";
import { ModernHouse } from "./ModernHouse.js";
import { Apartment } from "./Apartment.js";
import { SimpleRoom } from "./SimpleRoom.js";
import { ProgrammaticBlock } from "./ProgrammaticBlock.js";

/**
 * The registration root, Remotion-style. The Studio mounts this; each
 * <Composition> registers a building it can visualise.
 */
export function Root() {
  return (
    <>
      <Composition id="modern-house" name="Modern House" component={ModernHouse} />
      <Composition id="apartment" name="Apartment" component={Apartment} />
      <Composition id="simple-room" name="Simple Room" component={SimpleRoom} />
      <Composition id="programmatic-block" name="Apartment Block" component={ProgrammaticBlock} />
    </>
  );
}

export default Root;
