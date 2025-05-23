import type { Meta, StoryObj } from '@storybook/react';
import BookCard from './BookCard';
import { Book } from '@/types/book'; // Corrected import path

const meta: Meta<typeof BookCard> = {
  title: 'Library/BookCard',
  component: BookCard,
  parameters: {
    layout: 'centered', // Center the card for better viewing
  },
  tags: ['autodocs'],
  argTypes: {
    // We can define controls for each prop here if needed
    // For complex objects like 'book', Storybook might not auto-generate controls effectively
    // but we can pass different 'args' in each story variant.
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleBook: Book = {
  id: '1',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  genre: 'Fiction',
  coverImageUrl: 'https://images-na.ssl-images-amazon.com/images/I/81QuEGw8VPL.jpg', // Example image
  readingProgress: 65,
  status: 'reading',
  isPinned: true,
  filePath: '/path/to/greatgatsby.epub',
  summary: 'A story about the Jazz Age.'
  // Add other fields as per your Book type definition
};

export const Default: Story = {
  args: {
    book: sampleBook,
  },
};

export const NewBook: Story = {
  args: {
    book: {
      ...sampleBook,
      id: '2',
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      genre: 'Non-Fiction',
      coverImageUrl: 'https://images-na.ssl-images-amazon.com/images/I/713jIoMO3UL.jpg',
      readingProgress: 0,
      status: 'unread',
      isPinned: false,
    },
  },
};

export const FinishedBook: Story = {
  args: {
    book: {
      ...sampleBook,
      id: '3',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      genre: 'Fiction',
      coverImageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71FxgtFKcQL.jpg',
      readingProgress: 100,
      status: 'finished',
      isPinned: false,
    },
  },
};

export const NoCoverImage: Story = {
    args: {
      book: {
        ...sampleBook,
        id: '4',
        title: '1984',
        author: 'George Orwell',
        coverImageUrl: undefined, // Test case for missing cover
        readingProgress: 25,
      },
    },
  }; 