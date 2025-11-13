import { Button } from "@/components/ui/button";
import { FlowLine } from "@/components/ui/flow-line";
import { KeyCap } from "@/components/ui/keycap";
import { TypingStream } from "@/interfaces/types";
import Image from "next/image";

const testStream: TypingStream = 'This is a test stream for the FlowLine component.'.split('').map(char => ({
  targetSymbol: char,
  attempts: [{ typedChar: char, timestamp: 0 }],
}));

// Add some errors for demonstration
testStream[2].attempts.unshift({ typedChar: 'x', timestamp: 0 }); // 1 error
testStream[5].attempts.unshift({ typedChar: 'y', timestamp: 0 });
testStream[5].attempts.unshift({ typedChar: 'z', timestamp: 0 }); // 2 errors


export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <Button variant="ghost">hello</Button>
        <KeyCap />
        <br></br>
        <FlowLine stream={testStream} cursorPosition={10} />


      </main>
    </div>
  );
}
