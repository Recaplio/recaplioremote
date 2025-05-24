"use client";

import { useRouter } from "next/navigation";

interface ChunkSelectorProps {
  basePath: string;
  currentChunkIndex: number;
  totalChunks: number;
  disabled?: boolean;
}

export default function ChunkSelector({
  basePath,
  currentChunkIndex,
  totalChunks,
  disabled = false,
}: ChunkSelectorProps) {
  const router = useRouter();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newChunkIndex = event.target.value;
    router.push(`${basePath}?chunk=${newChunkIndex}`);
  };

  if (disabled || totalChunks === 0) {
    return (
      <select
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500 max-w-[150px] sm:max-w-xs truncate opacity-50 cursor-not-allowed"
        disabled
        value={currentChunkIndex}
      >
        <option value={currentChunkIndex}>
          {totalChunks > 0 ? `Chunk ${currentChunkIndex + 1}` : "No Chunks"}
        </option>
      </select>
    );
  }

  return (
    <select
      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500 max-w-[150px] sm:max-w-xs truncate"
      value={currentChunkIndex.toString()}
      onChange={handleChange}
      disabled={disabled || totalChunks === 0}
    >
      {Array.from({ length: totalChunks }, (_, i) => (
        <option key={i} value={i.toString()}>
          Chunk {i + 1}
        </option>
      ))}
    </select>
  );
} 