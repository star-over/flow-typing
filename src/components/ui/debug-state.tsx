// Helper component for displaying debug state
export const DebugState = ({ dataFlowLine, dataViewModel }: { dataFlowLine: unknown; dataViewModel: unknown; }) => {
    // The 'replacer' function is used to handle special cases during JSON serialization.
    // In this case, it ensures that 'undefined' values are explicitly converted to the string "undefined"
    // instead of being omitted, which is the default behavior of JSON.stringify.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replacer = (key: string, value: any) => (typeof value === 'undefined' ? 'undefined' : value);
  
    const stateString = `
  import { HandsExtFixture } from './types';
  export const simpleKFixture: HandsExtFixture = {
    input: ${JSON.stringify(dataFlowLine, replacer)?.replace(/"undefined"/g, 'undefined')},
    expectedOutput: ${JSON.stringify(dataViewModel, replacer)?.replace(/"undefined"/g, 'undefined')},
  };  
  `;
  
    return (
      <div className="w-full mt-8">
        <h3 className="text-lg font-bold">State</h3>
        <textarea
          readOnly
          className="w-full h-48 p-2 font-mono text-xs bg-gray-100 dark:bg-gray-900 border rounded"
          value={stateString}
          onClick={async (e) => {
            const textToCopy = (e.target as HTMLTextAreaElement).value;
            try {
              await navigator.clipboard.writeText(textToCopy);
              // console.log('Content copied to clipboard'); // For debugging
            } catch (err) {
              console.error('Failed to copy: ', err);
            }
          }}
        />
      </div>
    );
  };
  