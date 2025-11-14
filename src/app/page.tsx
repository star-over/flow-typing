import { Button } from "@/components/ui/button";
import { FlowLine } from "@/components/ui/flow-line";
import { KeyCap } from "@/components/ui/keycap";
import { TypingStream } from "@/interfaces/types";
import { createTypingStream } from "@/lib/stream";
import Image from "next/image";

const fullStreamText = 'This is a test stream for the FlowLine component.';

const testStreamCompleted: TypingStream = fullStreamText.split('').map(char => ({
  targetSymbol: char,
  attempts: [{ typedChar: char, startAt: 0, endAt: 100 }],
}));

// Add some errors for demonstration
testStreamCompleted[2].attempts?.unshift({ typedSymbol: 'x', startAt: 0, endAt: 50 }); // 1 error
testStreamCompleted[5].attempts?.unshift({ typedSymbol: 'y', startAt: 0, endAt: 50 });
testStreamCompleted[5].attempts?.unshift({ typedSymbol: 'z', startAt: 50, endAt: 100 }); // 2 errors

const testStreamPending: TypingStream = createTypingStream(fullStreamText);


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
        <FlowLine stream={testStreamCompleted} cursorPosition={10} />
        <FlowLine stream={testStreamPending} cursorPosition={0} />


      </main>
    </div>
  );
}
