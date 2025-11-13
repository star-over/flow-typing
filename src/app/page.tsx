import { Button } from "@/components/ui/button";
import { FlowLine } from "@/components/ui/flow-line";
import { KeyCap } from "@/components/ui/keycap";
import Image from "next/image";

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
        <FlowLine stream="This is a test stream for the FlowLine component." cursorPosition={10} />


      </main>
    </div>
  );
}
