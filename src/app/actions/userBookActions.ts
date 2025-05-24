"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateReadingProgress(
  userBookId: number,
  newChunkIndex: number,
  totalChunks: number
) {
  if (totalChunks <= 0) {
    console.warn("[updateReadingProgress] totalChunks is 0 or negative, cannot calculate progress.");
    // Optionally, still update chunk index if desired, or return error
    // For now, we'll just update the chunk index if totalChunks is invalid for progress calculation
  }

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[updateReadingProgress] Auth error or no user:", authError);
    return { success: false, message: "User not authenticated." };
  }

  if (typeof userBookId !== 'number' || typeof newChunkIndex !== 'number' || typeof totalChunks !== 'number'){
    console.error("[updateReadingProgress] Invalid input types.");
    return { success: false, message: "Invalid input types." };
  }
  
  const progressPercent = totalChunks > 0 
    ? Math.round(((newChunkIndex + 1) / totalChunks) * 100)
    : 0;

  console.log(
    `[updateReadingProgress] Updating user_book_id: ${userBookId}, user: ${user.id}, newChunkIndex: ${newChunkIndex}, progress: ${progressPercent}%`
  );

  const { error } = await supabase
    .from("user_books")
    .update({
      current_chunk_index: newChunkIndex,
      reading_progress_percent: progressPercent,
    })
    .eq("id", userBookId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[updateReadingProgress] Error updating user_books:", error);
    return { success: false, message: `Failed to update reading progress: ${error.message}` };
  }

  // Revalidate the reader page path and potentially the library if progress is shown there.
  revalidatePath(`/reader/${userBookId}`);
  revalidatePath('/library'); // Assuming library might show progress

  console.log("[updateReadingProgress] Successfully updated reading progress and revalidated paths.");
  return { success: true, message: "Reading progress updated." };
} 