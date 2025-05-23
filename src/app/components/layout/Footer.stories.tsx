import type { Meta, StoryObj } from '@storybook/react';
import Footer from './Footer'; // Assuming Footer.tsx is in the same directory

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof Footer> = {
  title: 'Layout/Footer', // Category/Component name in Storybook UI
  component: Footer,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen', // Footer typically spans full width
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // Define argTypes if your component has props you want to control in Storybook
    // Example:
    // backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { 
    // onClick: fn()
   },
};

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    // Props for your component, if any
    // Example:
    // primary: true,
    // label: 'Footer Button',
  },
}; 