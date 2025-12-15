import { VirtualKey, FingerId, KeyCapNavigationRole, Visibility } from "@/interfaces/types";
import { KeyCap } from "./keycap";
import { JSX } from "react";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { getFingerByKeyCap } from "@/lib/symbol-utils";
import { getKeyCapIdsByFingerId } from "@/lib/hand-utils";
import { getPathKeyCapIds } from "@/lib/virtual-layout";

export type VirtualKeyboardProps = React.ComponentProps<"div">
  & {
    virtualLayout: VirtualKey[][];
    targetKeyCapId?: KeyCapId;
  }

type VirtualRowProps = React.ComponentProps<"div">
  & {
    row: VirtualKey[];
    targetKeyCapId?: KeyCapId;
    activeFingerKeyCapIds: KeyCapId[];
    pathKeyCapIds: KeyCapId[];
  }

export function VirtualKeyboard({ virtualLayout, targetKeyCapId }: VirtualKeyboardProps): JSX.Element {
  let activeFingerKeyCapIds: KeyCapId[] = [];
  let pathKeyCapIds: KeyCapId[] = [];
  let homeKeyCapId: KeyCapId | undefined;

  if (targetKeyCapId) {
    const targetFingerId: FingerId | undefined = getFingerByKeyCap(targetKeyCapId, fingerLayoutASDF);
    if (targetFingerId) {
      activeFingerKeyCapIds = getKeyCapIdsByFingerId(targetFingerId, fingerLayoutASDF);
      homeKeyCapId = fingerLayoutASDF.find(
        (key) => key.fingerId === targetFingerId && key.isHomeKey
      )?.keyCapId;

      if (homeKeyCapId) {
        pathKeyCapIds = getPathKeyCapIds(virtualLayout, homeKeyCapId, targetKeyCapId);
      }
    }
  }

  const rows = virtualLayout.map((row: VirtualKey[], rowIndex: number) => (
    <VirtualRow
      row={row}
      key={rowIndex}
      targetKeyCapId={targetKeyCapId}
      activeFingerKeyCapIds={activeFingerKeyCapIds}
      pathKeyCapIds={pathKeyCapIds}
    />
  ));

  return (
    <div className="flex flex-col w-fit gap-0.5">
      {rows}
    </div>
  )
};

function VirtualRow({ row, targetKeyCapId, activeFingerKeyCapIds, pathKeyCapIds }: VirtualRowProps): JSX.Element {
  const keyCaps = row.map((virtualKey) => {
    let navigationRole: KeyCapNavigationRole = "IDLE";
    let visibility: Visibility = "INVISIBLE";

    if (activeFingerKeyCapIds.includes(virtualKey.keyCapId)) {
      visibility = "VISIBLE";
      if (virtualKey.keyCapId === targetKeyCapId) {
        navigationRole = "TARGET";
      } else if (pathKeyCapIds.includes(virtualKey.keyCapId)) {
        navigationRole = "PATH";
      } else {
        navigationRole = "IDLE";
      }
    }

    return (
      <KeyCap
        key={virtualKey.keyCapId}
        {...virtualKey}
        navigationRole={navigationRole}
        visibility={visibility}
      />
    );
  });

  return (
    <div className="flex flex-nowrap gap-0.5">
      {keyCaps}
    </div>
  );
};
