import { JSX, useState } from "react";

export type TrainerProps = React.ComponentProps<"div">

export function Trainer(
  { className, ...props }: TrainerProps
): JSX.Element {
  const [key, setKey] = useState("a")
  return (
    <div
      tabIndex={0} // Make the div focusable to receive keyboard events
      // onKeyDown={(e) => setKey(e.key)}
      onKeyDown={(e) => console.log(e.type, e.code, e.shiftKey)}
      onKeyUp ={(e) => console.log(e.type, e.code, e.shiftKey)}
      className={className}
      {...props}
    >
      {key}
    </div>
  )
}
