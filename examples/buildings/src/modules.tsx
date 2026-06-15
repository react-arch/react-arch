import { Door, Fixture, Room, Window } from "@react-arch/react";

/**
 * Reusable architectural components. Because buildings are just React, these
 * compose like any other component — the whole point of React Arch.
 */

export function StandardBathroom(props: { id: string; x: number; y: number }) {
  return (
    <Room id={props.id} name="Bathroom" x={props.x} y={props.y} width={2.4} depth={2.2} usage="wet">
      <Door wall="south" width={0.8} />
      <Fixture type="toilet" x={props.x + 0.5} y={props.y + 1.6} />
      <Fixture type="sink" x={props.x + 1.7} y={props.y + 1.7} />
      <Fixture type="shower" x={props.x + 0.6} y={props.y + 0.5} />
    </Room>
  );
}

export function KitchenModule(props: { id: string; x: number; y: number; width?: number; depth?: number }) {
  const w = props.width ?? 4;
  const d = props.depth ?? 4;
  return (
    <Room id={props.id} name="Kitchen" x={props.x} y={props.y} width={w} depth={d} usage="kitchen">
      <Window wall="north" offset={w / 2} width={1.6} />
      <Fixture type="kitchen counter" x={props.x + 0.4} y={props.y + 0.4} scaleX={3} />
      <Fixture type="sink" x={props.x + 1.5} y={props.y + 0.5} />
    </Room>
  );
}

export function BedroomModule(props: { id: string; name?: string; x: number; y: number; width?: number; depth?: number }) {
  const w = props.width ?? 5;
  const d = props.depth ?? 4;
  return (
    <Room id={props.id} name={props.name ?? "Bedroom"} x={props.x} y={props.y} width={w} depth={d} usage="sleeping">
      <Door wall="south" offset={1} width={0.9} />
      <Window wall="west" offset={d / 2} width={2.2} height={1.4} />
      <Fixture type="bed" x={props.x + 1.6} y={props.y + 1.4} scaleX={1.6} scaleY={2} />
    </Room>
  );
}
