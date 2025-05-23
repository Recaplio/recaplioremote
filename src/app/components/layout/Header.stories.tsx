import type { Meta, StoryObj } from '@storybook/react';
import Header from './Header';

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    // Mock Next.js router for components using next/link
    // The @storybook/experimental-nextjs-vite framework should handle this, 
    // but specific parameters can be added if needed.
    // nextjs: {
    //   appDirectory: true, // if all links are for app router
    //   router: {
    //     pathname: '/', // Default path for links
    //   },
    // },
  },
  tags: ['autodocs'],
  argTypes: {},
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
}; 