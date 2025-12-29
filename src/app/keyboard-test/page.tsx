"use client";

import { keyboardMachine } from "@/machines/keyboard.machine";
import { useMachine } from "@xstate/react";
import { KeyCapId } from "@/interfaces/key-cap-id";
import React, { useEffect, useState } from "react";

export default function KeyboardTestPage() {
  const [recognized, setRecognized] = useState<KeyCapId[][]>([]);

  const [snapshot, send] = useMachine(keyboardMachine, {
    input: {
      onRecognize: (keys: KeyCapId[]) => {
        setRecognized((prev) => [...prev, keys]);
      },
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent default browser actions for keys like Tab, Space, etc.
    e.preventDefault();
    send({ type: "KEY_DOWN", keyCapId: e.code as KeyCapId });
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    send({ type: "KEY_UP", keyCapId: e.code as KeyCapId });
  };
  
  // Reset keys if the window loses focus to prevent stuck keys
  useEffect(() => {
    const handleBlur = () => {
      send({ type: "RESET" });
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [send]);


  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      autoFocus
    >
      <h1 className="text-4xl font-bold mb-4">Keyboard Machine Test</h1>
      <p className="text-lg mb-8">
        Нажмите любую клавишу, чтобы протестировать машину состояний.
      </p>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Current State */}
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-3 border-b border-gray-700 pb-2">
            Текущее состояние
          </h2>
          <p className="text-3xl font-mono bg-gray-900 px-3 py-1 rounded-md inline-block text-cyan-400">
            {String(snapshot.value)}
          </p>
        </div>

        {/* Pressed Keys */}
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-3 border-b border-gray-700 pb-2">
            Нажатые клавиши
          </h2>
          <div className="flex flex-wrap gap-2">
            {Array.from(snapshot.context.pressedKeys).length > 0 ? (
              Array.from(snapshot.context.pressedKeys).map((key) => (
                <span
                  key={key}
                  className="bg-blue-600 text-white font-mono py-1 px-3 rounded-md text-lg"
                >
                  {key}
                </span>
              ))
            ) : (
              <p className="text-gray-400">Нет нажатых клавиш</p>
            )}
          </div>
        </div>

        {/* Recognized Combos */}
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg md:col-span-3">
          <h2 className="text-2xl font-semibold mb-3 border-b border-gray-700 pb-2">
            Распознанные комбинации
          </h2>
          <button
            onClick={() => setRecognized([])}
            className="mb-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Очистить
          </button>
          <div className="h-64 overflow-y-auto bg-gray-900 rounded-md p-4 space-y-2">
            {recognized.length > 0 ? (
              recognized.map((combo, index) => (
                <div key={index} className="flex flex-wrap gap-2">
                  <span className="font-semibold text-gray-400">{index + 1}:</span>
                  {combo.map((key) => (
                    <span
                      key={key}
                      className="bg-purple-600 text-white font-mono py-1 px-2 rounded-md text-sm"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              )).reverse()
            ) : (
              <p className="text-gray-500">
                Здесь будут показаны распознанные комбинации...
              </p>
            )}
          </div>
        </div>
      </div>
       <div className="mt-8 text-center text-gray-400">
        <p>Не забудьте запустить сервер разработки:</p>
        <code className="bg-gray-800 p-2 rounded-md">npm run dev</code>
        <p className="mt-2">И откройте <a href="/keyboard-test" className="text-cyan-400 underline">/keyboard-test</a> в вашем браузере.</p>
      </div>
    </div>
  );
}

