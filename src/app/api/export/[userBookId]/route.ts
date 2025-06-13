import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getUserTier } from '@/lib/ai/rag';

interface ExportRequest {
  format: 'notion' | 'markdown' | 'pdf' | 'docx';
  includeHighlights?: boolean;
  includeNotes?: boolean;
  includeFlashcards?: boolean;
  includeAIRecaps?: boolean;
}

interface ExportData {
  book: {
    id: number;
    title: string;
    author: string;
    reading_mode: string;
  };
  highlights: Array<{
    id: number;
    text_content: string;
    annotation_data: Record<string, unknown>;
    created_at: string;
  }>;
  notes: Array<{
    id: number;
    text_content: string;
    annotation_data: Record<string, unknown>;
    created_at: string;
  }>;
  flashcards: Array<{
    id: number;
    front_text: string;
    back_text: string;
    created_at: string;
  }>;
  aiRecaps: Array<{
    id: number;
    content: string;
    recap_type: string;
    created_at: string;
  }>;
  exportedAt: string;
  exportFormat: string;
}

// POST /api/export/[userBookId] - Export user data for a book
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userBookId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier - Export is Pro only
    const userTier = await getUserTier(user.id);
    if (userTier !== 'PRO') {
      return NextResponse.json({ 
        error: 'Export functionality is a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { userBookId: userBookIdParam } = await params;
    const userBookId = parseInt(userBookIdParam);
    if (isNaN(userBookId)) {
      return NextResponse.json({ error: 'Invalid userBookId' }, { status: 400 });
    }

    const body: ExportRequest = await request.json();
    const { 
      format, 
      includeHighlights = true, 
      includeNotes = true, 
      includeFlashcards = true, 
      includeAIRecaps = true 
    } = body;

    if (!format || !['notion', 'markdown', 'pdf', 'docx'].includes(format)) {
      return NextResponse.json({ 
        error: 'Invalid format. Must be one of: notion, markdown, pdf, docx' 
      }, { status: 400 });
    }

    // Verify user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, title, author, reading_mode')
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Collect all user data for this book
    const exportData: ExportData = {
      book: userBook,
      highlights: [],
      notes: [],
      flashcards: [],
      aiRecaps: [],
      exportedAt: new Date().toISOString(),
      exportFormat: format
    };

    // Get highlights and notes
    if (includeHighlights || includeNotes) {
      const { data: annotations, error: annotationsError } = await supabase
        .from('annotations')
        .select('*')
        .eq('user_book_id', userBookId)
        .order('created_at');

      if (!annotationsError && annotations) {
        exportData.highlights = annotations.filter(a => a.type === 'highlight');
        exportData.notes = annotations.filter(a => a.type === 'note');
      }
    }

    // Get flashcards
    if (includeFlashcards) {
      const { data: flashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_book_id', userBookId)
        .order('created_at');

      if (!flashcardsError && flashcards) {
        exportData.flashcards = flashcards;
      }
    }

    // Get AI recaps
    if (includeAIRecaps) {
      const { data: aiRecaps, error: recapsError } = await supabase
        .from('ai_recaps')
        .select('*')
        .eq('user_book_id', userBookId)
        .order('created_at');

      if (!recapsError && aiRecaps) {
        exportData.aiRecaps = aiRecaps;
      }
    }

    // Generate export content based on format
    let exportContent: string;
    let mimeType: string;
    let fileExtension: string;

    switch (format) {
      case 'notion':
        exportContent = generateNotionExport(exportData);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'markdown':
        exportContent = generateMarkdownExport(exportData);
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'pdf':
        // For MVP, we'll generate HTML that can be converted to PDF client-side
        exportContent = generateHTMLForPDF(exportData);
        mimeType = 'text/html';
        fileExtension = 'html';
        break;
      case 'docx':
        // For MVP, we'll generate HTML that can be converted to DOCX client-side
        exportContent = generateHTMLForDOCX(exportData);
        mimeType = 'text/html';
        fileExtension = 'html';
        break;
      default:
        return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
    }

    // Save export history
    const { error: historyError } = await supabase
      .from('export_history')
      .insert({
        user_book_id: userBookId,
        export_type: format,
        export_data: {
          includeHighlights,
          includeNotes,
          includeFlashcards,
          includeAIRecaps,
          itemCounts: {
            highlights: exportData.highlights.length,
            notes: exportData.notes.length,
            flashcards: exportData.flashcards.length,
            aiRecaps: exportData.aiRecaps.length
          }
        }
      });

    if (historyError) {
      console.error('Error saving export history:', historyError);
      // Don't fail the export for this
    }

    // Return the export content
    const fileName = `${userBook.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.${fileExtension}`;

    return new NextResponse(exportContent, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Export-Format': format,
        'X-Book-Title': userBook.title
      }
    });

  } catch (error) {
    console.error('Error exporting book data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/export/[userBookId] - Get export history for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userBookId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier
    const userTier = await getUserTier(user.id);
    if (userTier !== 'PRO') {
      return NextResponse.json({ 
        error: 'Export functionality is a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { userBookId: userBookIdParam } = await params;
    const userBookId = parseInt(userBookIdParam);
    if (isNaN(userBookId)) {
      return NextResponse.json({ error: 'Invalid userBookId' }, { status: 400 });
    }

    // Verify user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, title')
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Get export history
    const { data: exportHistory, error: historyError } = await supabase
      .from('export_history')
      .select('*')
      .eq('user_book_id', userBookId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching export history:', historyError);
      return NextResponse.json({ error: 'Failed to fetch export history' }, { status: 500 });
    }

    return NextResponse.json({
      bookTitle: userBook.title,
      exportHistory: exportHistory || []
    });

  } catch (error) {
    console.error('Error fetching export history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for different export formats

function generateNotionExport(data: ExportData): string {
  // Generate Notion-compatible JSON structure
  const notionBlocks: Array<Record<string, unknown>> = [
    {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ type: 'text', text: { content: `${data.book.title} - Reading Notes` } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: `Author: ${data.book.author}` } },
          { type: 'text', text: { content: `\nReading Mode: ${data.book.reading_mode}` } },
          { type: 'text', text: { content: `\nExported: ${new Date(data.exportedAt).toLocaleDateString()}` } }
        ]
      }
    }
  ];

  // Add highlights
  if (data.highlights.length > 0) {
    notionBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Highlights' } }]
      }
    });

    data.highlights.forEach((highlight) => {
      notionBlocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [{ type: 'text', text: { content: highlight.text_content } }]
        }
      });
    });
  }

  // Add notes
  if (data.notes.length > 0) {
    notionBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Notes' } }]
      }
    });

    data.notes.forEach((note) => {
      notionBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: note.text_content } }]
        }
      });
    });
  }

  // Add flashcards
  if (data.flashcards.length > 0) {
    notionBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Flashcards' } }]
      }
    });

    data.flashcards.forEach((card) => {
      notionBlocks.push({
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [{ type: 'text', text: { content: card.front_text } }],
          children: [{
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: card.back_text } }]
            }
          }]
        }
      });
    });
  }

  return JSON.stringify({ blocks: notionBlocks }, null, 2);
}

function generateMarkdownExport(data: ExportData): string {
  let markdown = `# ${data.book.title} - Reading Notes\n\n`;
  markdown += `**Author:** ${data.book.author}\n`;
  markdown += `**Reading Mode:** ${data.book.reading_mode}\n`;
  markdown += `**Exported:** ${new Date(data.exportedAt).toLocaleDateString()}\n\n`;

  if (data.highlights.length > 0) {
    markdown += `## Highlights\n\n`;
    data.highlights.forEach((highlight) => {
      markdown += `> ${highlight.text_content}\n\n`;
    });
  }

  if (data.notes.length > 0) {
    markdown += `## Notes\n\n`;
    data.notes.forEach((note, index) => {
      markdown += `### Note ${index + 1}\n${note.text_content}\n\n`;
    });
  }

  if (data.flashcards.length > 0) {
    markdown += `## Flashcards\n\n`;
    data.flashcards.forEach((card, index) => {
      markdown += `### Card ${index + 1}\n`;
      markdown += `**Q:** ${card.front_text}\n`;
      markdown += `**A:** ${card.back_text}\n\n`;
    });
  }

  if (data.aiRecaps.length > 0) {
    markdown += `## AI Recaps\n\n`;
    data.aiRecaps.forEach((recap, index) => {
      markdown += `### ${recap.recap_type} Recap ${index + 1}\n`;
      markdown += `${recap.content}\n\n`;
    });
  }

  return markdown;
}

function generateHTMLForPDF(data: ExportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${data.book.title} - Reading Notes</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #333; border-bottom: 2px solid #333; }
        h2 { color: #666; margin-top: 30px; }
        .highlight { background-color: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
        .note { background-color: #e7f3ff; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; }
        .flashcard { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .flashcard-front { font-weight: bold; margin-bottom: 10px; }
        .flashcard-back { color: #666; }
        .metadata { color: #888; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>${data.book.title} - Reading Notes</h1>
    <div class="metadata">
        <p><strong>Author:</strong> ${data.book.author}</p>
        <p><strong>Reading Mode:</strong> ${data.book.reading_mode}</p>
        <p><strong>Exported:</strong> ${new Date(data.exportedAt).toLocaleDateString()}</p>
    </div>
    
    ${data.highlights.length > 0 ? `
    <h2>Highlights</h2>
    ${data.highlights.map((h) => `<div class="highlight">${h.text_content}</div>`).join('')}
    ` : ''}
    
    ${data.notes.length > 0 ? `
    <h2>Notes</h2>
    ${data.notes.map((n) => `<div class="note">${n.text_content}</div>`).join('')}
    ` : ''}
    
    ${data.flashcards.length > 0 ? `
    <h2>Flashcards</h2>
    ${data.flashcards.map((c) => `
        <div class="flashcard">
            <div class="flashcard-front">Q: ${c.front_text}</div>
            <div class="flashcard-back">A: ${c.back_text}</div>
        </div>
    `).join('')}
    ` : ''}
    
    ${data.aiRecaps.length > 0 ? `
    <h2>AI Recaps</h2>
    ${data.aiRecaps.map((r) => `
        <div class="note">
            <h3>${r.recap_type} Recap</h3>
            <p>${r.content}</p>
        </div>
    `).join('')}
    ` : ''}
</body>
</html>`;
}

function generateHTMLForDOCX(data: ExportData): string {
  // Similar to PDF but with Word-friendly styling
  return generateHTMLForPDF(data);
} 