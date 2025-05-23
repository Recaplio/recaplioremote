import type { Preview } from '@storybook/react'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    // Potentially add Next.js router mock or other global parameters here if needed later
    // nextjs: {
    //   appDirectory: true, // If using App Router primarily
    // },
  },
  // You can add global decorators here if needed, for example, to wrap stories in context providers
  // decorators: [
  //   (Story) => (
  //     <YourContextProvider>
  //       <Story />
  //     </YourContextProvider>
  //   ),
  // ],
};

export default preview;