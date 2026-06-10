import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Link,
  Image as ImageIcon,
  Minus,
  Copy,
  Maximize2,
  Minimize2,
  X,
  Upload,
  ExternalLink,
  Camera,
  Undo,
  Redo,
  Code,
  Type
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Write your content here...',
  className = '',
  onImageUpload,
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [resizeOverlay, setResizeOverlay] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number; startHeight: number; handle: string; containerRect?: DOMRect } | null>(null);

  const savedSelectionRef = useRef<{
    range: Range | null;
    editorHtml: string;
  }>({ range: null, editorHtml: '' });

  useEffect(() => {
    if (editorRef.current) {
      if (!value || value === '<p></p>' || value === '<p><br></p>') {
        editorRef.current.innerHTML = '<p><br></p>';
      } else if (value !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = value;
      }
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '<p><br></p>';
    }
  }, [value]);

  // Image Resizing Logic
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (editorRef.current && editorRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG' && target.classList.contains('article-image')) {
          setSelectedImage(target as HTMLImageElement);
          updateOverlayPosition(target as HTMLImageElement);
        } else {
          // Only deselect if clicking outside the image and not on the resize handles
          const isResizeHandle = (e.target as HTMLElement).closest('.resize-handle');
          if (!isResizeHandle) {
            setSelectedImage(null);
            setResizeOverlay(null);
          }
        }
      } else {
        // Click outside editor
        const isResizeHandle = (e.target as HTMLElement).closest('.resize-handle');
        if (!isResizeHandle) {
          setSelectedImage(null);
          setResizeOverlay(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateOverlayPosition = (img: HTMLImageElement) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    setResizeOverlay({
      top: imgRect.top - containerRect.top,
      left: imgRect.left - containerRect.left,
      width: imgRect.width,
      height: imgRect.height
    });
  };

  // Update overlay on scroll or resize
  useEffect(() => {
    const handleUpdate = () => {
      if (selectedImage) {
        updateOverlayPosition(selectedImage);
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('scroll', handleUpdate);
    }
    window.addEventListener('resize', handleUpdate);

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('scroll', handleUpdate);
      }
      window.removeEventListener('resize', handleUpdate);
    };
  }, [selectedImage]);

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!selectedImage) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);

    // Cache container rect to avoid repeated reads
    const containerRect = containerRef.current?.getBoundingClientRect();

    resizeRef.current = {
      startX: e.clientX,
      startWidth: selectedImage.offsetWidth,
      startHeight: selectedImage.offsetHeight,
      handle,
      containerRect
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeRef.current || !selectedImage) return;

    const { startX, startWidth, startHeight, handle, containerRect } = resizeRef.current;

    // Check cache or re-measure
    const currentContainerRect = containerRect || containerRef.current?.getBoundingClientRect();

    // Calculate delta
    const deltaX = e.clientX - startX;

    let newWidth = startWidth;
    let newHeight = startHeight;

    const aspectRatio = startWidth / startHeight;

    if (handle.includes('e') || handle.includes('w')) {
      if (handle === 'se') {
        newWidth = startWidth + deltaX;
        newHeight = newWidth / aspectRatio;
      } else if (handle === 'sw') {
        newWidth = startWidth - deltaX;
        newHeight = newWidth / aspectRatio;
      } else if (handle === 'nw') {
        newWidth = startWidth - deltaX;
        newHeight = newWidth / aspectRatio;
      } else if (handle === 'ne') {
        newWidth = startWidth + deltaX;
        newHeight = newWidth / aspectRatio;
      }
    }

    // Min dimensions
    if (newWidth < 50) newWidth = 50;
    if (newHeight < 50) newHeight = 50;

    // Direct DOM updates
    selectedImage.style.width = `${newWidth}px`;
    selectedImage.style.height = `${newHeight}px`;

    if (overlayRef.current && currentContainerRect) {
      overlayRef.current.style.width = `${newWidth}px`;
      overlayRef.current.style.height = `${newHeight}px`;

      const imgRect = selectedImage.getBoundingClientRect();
      overlayRef.current.style.top = `${imgRect.top - currentContainerRect.top}px`;
      overlayRef.current.style.left = `${imgRect.left - currentContainerRect.left}px`;
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    resizeRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);

    if (selectedImage) {
      updateOverlayPosition(selectedImage);
    }

    handleEditorChange();
  };

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const saveToHistory = (html: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(html);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleEditorChange = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;

    if (html !== value) {
      onChange(html);

      if (historyIndex === history.length - 1) {
        saveToHistory(html);
      }
    }
  };

  const focusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const saveCursorPosition = (): boolean => {
    if (!editorRef.current) return false;

    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      // No selection exists, save end of editor
      savedSelectionRef.current = {
        range: null,
        editorHtml: editor.innerHTML
      };
      return true;
    }

    const range = selection.getRangeAt(0);

    // Check if the range is within our editor
    if (!editor.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = {
        range: null,
        editorHtml: editor.innerHTML
      };
      return true;
    }

    // Clone and save the range
    savedSelectionRef.current = {
      range: range.cloneRange(),
      editorHtml: editor.innerHTML
    };
    return true;
  };

  const restoreCursorPosition = (): Range | null => {
    if (!editorRef.current) return null;

    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!selection) return null;

    // If we don't have a saved range, return null and let caller handle it
    if (!savedSelectionRef.current.range) {
      return null;
    }

    // Try to restore saved range
    try {
      const savedRange = savedSelectionRef.current.range;

      // Check if the saved range nodes are still in the document
      if (savedRange.startContainer &&
        savedRange.endContainer &&
        editor.contains(savedRange.startContainer) &&
        editor.contains(savedRange.endContainer)) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
        return savedRange;
      }
    } catch (error) {
      // Range is invalid, will return null below
    }

    // If restoration failed, return null
    return null;
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleEditorChange();
    focusEditor();
  };

  const insertHTML = (html: string) => {
    document.execCommand('insertHTML', false, html);
    handleEditorChange();
    focusEditor();
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const html = history[newIndex];
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        onChange(html);
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const html = history[newIndex];
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        onChange(html);
      }
    }
  };

  const insertImageInsideEditor = (imageUrl: string, altText: string = 'Image'): void => {
    if (!editorRef.current) {
      toast.error('Editor is not ready');
      return;
    }

    const editor = editorRef.current;

    try {
      // First, focus the editor
      editor.focus();

      // Try to restore the saved cursor position
      let insertionRange = restoreCursorPosition();

      // If restoration failed, try to get current selection
      if (!insertionRange) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const currentRange = selection.getRangeAt(0);
          if (editor.contains(currentRange.commonAncestorContainer)) {
            insertionRange = currentRange;
          }
        }
      }

      // If still no valid range, create one at the end
      if (!insertionRange) {
        insertionRange = document.createRange();
        if (editor.lastChild) {
          insertionRange.setStartAfter(editor.lastChild);
        } else {
          insertionRange.selectNodeContents(editor);
        }
        insertionRange.collapse(false);

        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(insertionRange);
        }
      }

      const imageContainer = document.createElement('div');
      imageContainer.className = 'article-image-container';

      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = altText;
      img.className = 'article-image loading recently-added';

      img.onload = () => {
        img.classList.remove('loading');
        img.classList.add('loaded');

        setTimeout(() => {
          img.classList.remove('recently-added');
        }, 2000);
      };

      img.onerror = () => {
        img.classList.remove('loading');
        img.classList.add('error');
        img.alt = 'Failed to load image';
      };

      const caption = document.createElement('div');
      caption.className = 'image-caption';
      caption.textContent = altText;

      imageContainer.appendChild(img);
      imageContainer.appendChild(caption);

      const spacingBefore = document.createElement('p');
      spacingBefore.innerHTML = '<br>';
      spacingBefore.style.marginBottom = '0';

      const afterParagraph = document.createElement('p');
      afterParagraph.innerHTML = '<br>';
      afterParagraph.id = 'cursor-target-' + Date.now();
      afterParagraph.style.marginTop = '0';
      afterParagraph.style.marginBottom = '1em';

      const fragment = document.createDocumentFragment();
      fragment.appendChild(spacingBefore);
      fragment.appendChild(imageContainer);
      fragment.appendChild(afterParagraph);

      // Collapse the range to the end (cursor position) before inserting
      // This ensures the image is inserted at the current cursor position, not at the start of the range
      insertionRange.collapse(false);

      // Insert the fragment at the cursor position
      insertionRange.insertNode(fragment);

      // Move cursor after the inserted content
      const newRange = document.createRange();
      newRange.setStart(afterParagraph, 0);
      newRange.collapse(true);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      setTimeout(() => {
        imageContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 100);

      handleEditorChange();

      setTimeout(() => {
        editor.focus();
      }, 10);

      toast.success('Image inserted successfully');

    } catch (error) {
      console.error('Error inserting image:', error);
      toast.error('Failed to insert image');
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select image files only");
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return null;
    }

    const fileName = file.name;
    setUploadingImages(prev => new Set(prev).add(fileName));

    try {
      let imageUrl = '';

      if (onImageUpload) {
        imageUrl = await onImageUpload(file);
      } else {
        // Fallback or error if no onImageUpload provided and no default service
        toast.error("Image upload is not configured");
        throw new Error('Image upload not configured');
      }

      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      insertImageInsideEditor(imageUrl, fileName.replace(/\.[^/.]+$/, ""));

      return imageUrl;

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
      return null;

    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  const ImageUploadModal = () => {
    const modalRef = useRef<HTMLDivElement>(null);
    const imageUrlInputRef = useRef<HTMLInputElement>(null);
    const imageAltInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          event.stopPropagation();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCloseModal = () => {
      setShowImageUpload(false);
      setTimeout(() => {
        focusEditor();
      }, 50);
    };

    const handleInsertFromUrl = () => {
      const url = imageUrlInputRef.current?.value.trim();
      const alt = imageAltInputRef.current?.value.trim() || 'Image';

      if (!url) {
        toast.error('Please enter image URL');
        return;
      }

      insertImageInsideEditor(url, alt);
      handleCloseModal();
    };

    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={modalRef}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#06355c]/10 flex items-center justify-center">
                <Camera className="h-5 w-5 text-[#06355c]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Insert Image</h3>
                <p className="text-sm text-slate-500">Upload from device or enter URL</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseModal}
              className="rounded-full hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Drag and drop images here</Label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length === 0) return;

                    handleCloseModal();

                    for (const file of files) {
                      if (file.type.startsWith('image/')) {
                        await handleImageUpload(file);
                      }
                    }
                  }}
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Drag images here or click to select</p>
                  <p className="text-sm text-slate-500 mt-2">PNG, JPG, GIF, WEBP up to 5MB</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Use external image URL</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={imageUrlInputRef}
                      type="text"
                      placeholder="Enter image URL..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                      onKeyDown={(e) => e.key === 'Enter' && handleInsertFromUrl()}
                    />
                    <input
                      ref={imageAltInputRef}
                      type="text"
                      placeholder="Image alt text (optional)"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                      onKeyDown={(e) => e.key === 'Enter' && handleInsertFromUrl()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleInsertFromUrl}
                      className="flex-1 bg-[#06355c] text-white border-none"
                    >
                      <ExternalLink className="h-4 w-4 ml-2" />
                      Insert Image
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCloseModal}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upload from device</Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    handleCloseModal();

                    for (let i = 0; i < files.length; i++) {
                      await handleImageUpload(files[i]);
                    }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="hidden"
                  ref={fileInputRef}
                />
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 ml-2" />
                  Select image from device
                </Button>
              </div>
            </div>

            {uploadingImages.size > 0 && (
              <div className="mt-6 space-y-3">
                <Label className="text-slate-700">Uploading images...</Label>
                {Array.from(uploadingImages).map((fileName, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="h-10 w-10 bg-slate-200 rounded flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{fileName}</p>
                      <p className="text-xs text-slate-500">Uploading...</p>
                    </div>
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    const text = prompt('Enter link text:', 'Link');

    if (url && text) {
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:underline;">${text}</a>`;
      insertHTML(linkHtml);
    }
  };

  const clearFormatting = () => {
    execCommand('removeFormat');
    execCommand('unlink');
  };

  const handleOpenImageModal = () => {
    saveCursorPosition();
    setShowImageUpload(true);
  };

  return (
    <div ref={containerRef} className={cn("space-y-3 relative", className)} dir="ltr">
      <style>{`
        /* Resize Overlay Styles */
        .resize-overlay {
          position: absolute;
          border: 2px solid #3b82f6;
          pointer-events: none; /* Let clicks pass through body of overlay? No, we need it visible */
          z-index: 50;
          box-sizing: border-box;
          display: block;
          margin-top: 0 !important;
          transition: none !important;
        }
        
        .resize-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: white;
          border: 1px solid #3b82f6;
          border-radius: 50%;
          pointer-events: auto;
          z-index: 51;
        }

        .resize-handle:hover {
          background-color: #3b82f6;
        }

        .handle-nw { top: -6px; left: -6px; cursor: nw-resize; }
        .handle-ne { top: -6px; right: -6px; cursor: ne-resize; }
        .handle-sw { bottom: -6px; left: -6px; cursor: sw-resize; }
        .handle-se { bottom: -6px; right: -6px; cursor: se-resize; }

        .editor-root-container {
          display: flex;
          flex-direction: column;
          height: auto;
          min-height: 200px;
          padding:20px;
        }

        .wysiwyg-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          outline: none;
          min-height: 200px;
          background-color: white;
          flex: 1;
          overflow: visible;
          padding-bottom: 100px;
        }

        .wysiwyg-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }

        .wysiwyg-editor:focus {
          outline: none;
        }

        .wysiwyg-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 1.5em 0 0.75em 0;
          color: #1f2937;
          line-height: 1.3;
        }

        .wysiwyg-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1.25em 0 0.625em 0;
          color: #374151;
          line-height: 1.3;
        }

        .wysiwyg-editor h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 1em 0 0.5em 0;
          color: #4b5563;
          line-height: 1.3;
        }

        .wysiwyg-editor p {
          margin: 1em 0;
          line-height: 1.8;
        }

        .wysiwyg-editor ul,
        .wysiwyg-editor ol {
          margin: 1em 0;
          padding-right: 0;
          padding-left: 2em;
        }

        .wysiwyg-editor ul {
          list-style-type: disc;
        }

        .wysiwyg-editor ol {
          list-style-type: decimal;
        }

        .wysiwyg-editor li {
          margin: 0.5em 0;
        }

        .wysiwyg-editor a {
          color: #3b82f6;
          text-decoration: underline;
        }

        .wysiwyg-editor a:hover {
          text-decoration: none;
        }

        .wysiwyg-editor .article-image-container {
          margin: 2em 0;
          position: relative;
          overflow: hidden;
          border-radius: 0.5em;
        }

        .wysiwyg-editor img.article-image {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 80vh;
          margin: 0 auto;
          display: block;
          border-radius: 0.5em;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background-color: #f8fafc;
          transition: opacity 0.3s, filter 0.3s, box-shadow 0.3s;
          object-fit: contain;
          padding: 4px;
          box-sizing: border-box;
        }


        .wysiwyg-editor img.article-image.loading {
          opacity: 0.7;
          filter: blur(2px);
        }

        .wysiwyg-editor img.article-image.loaded {
          opacity: 1;
          filter: none;
        }

        .wysiwyg-editor img.article-image.error {
          border-color: #ef4444;
          background-color: #fef2f2;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
        }

        .wysiwyg-editor .image-caption {
          display: none;
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
          margin-top: 0.75em;
          line-height: 1.5;
          padding: 0 1em;
        }

        .wysiwyg-editor h1 + .article-image-container,
        .wysiwyg-editor h2 + .article-image-container,
        .wysiwyg-editor h3 + .article-image-container {
          margin-top: 1.5em;
        }

        .wysiwyg-editor .article-image-container + h1,
        .wysiwyg-editor .article-image-container + h2,
        .wysiwyg-editor .article-image-container + h3,
        .wysiwyg-editor .article-image-container + p,
        .wysiwyg-editor .article-image-container + ul,
        .wysiwyg-editor .article-image-container + ol,
        .wysiwyg-editor .article-image-container + blockquote {
          margin-top: 1.5em;
        }

        .wysiwyg-editor blockquote {
          border-left: 4px solid #d1d5db;
          border-right: none;
          padding: 0.75em 1.25em;
          margin: 1.5em 0;
          font-style: italic;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 0.375em;
        }

        .wysiwyg-editor pre {
          background: #f3f4f6;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          margin: 1.5em 0;
          border: 1px solid #e5e7eb;
        }

        .wysiwyg-editor code {
          background: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          border: 1px solid #e5e7eb;
        }

        .wysiwyg-editor hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2.5em 0;
        }

        @media (max-width: 768px) {
          .wysiwyg-editor img.article-image {
            max-height: 70vh;
            border-radius: 0.375em;
          }
          
          .wysiwyg-editor .article-image-container {
            margin: 1.5em 0;
          }
        }

        @media (max-width: 480px) {
          .wysiwyg-editor img.article-image {
            max-height: 60vh;
            border-width: 0.5px;
          }
          
          .wysiwyg-editor .article-image-container {
            margin: 1.25em 0;
          }
        }

        .fullscreen-editor {
          position: fixed !important;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          background-color: white;
        }

        .fullscreen-editor .wysiwyg-editor {
          overflow-y: auto;
          max-height: 100vh;
        }

        .editor-border-container {
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          background-color: white;
          overflow: visible;
        }

        .editor-border-container.border-none {
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background-color: transparent !important;
        }

        @keyframes gentlePulse {
          0% { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
          50% { box-shadow: 0 4px 8px rgba(16, 185, 129, 0.1); }
          100% { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
        }

        .wysiwyg-editor img.article-image.recently-added {
          animation: gentlePulse 2s ease-in-out 2;
        }
      `}</style>

      {label && (
        <Label className="text-left text-gray-800 flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <div
        className={cn(
          "editor-border-container transition-all duration-300",
          disabled ? "border-none shadow-none rounded-none bg-transparent" : "shadow-sm",
          isFullscreen && "fullscreen-editor"
        )}
      >
        {!disabled && (
          <div className="border-b border-slate-200 bg-slate-50 p-2">
          <div className="flex flex-wrap items-center gap-1">
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={historyIndex === 0}
                className="h-8 w-8 p-0"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={historyIndex === history.length - 1}
                className="h-8 w-8 p-0"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('bold')}
                className="h-8 w-8 p-0"
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('italic')}
                className="h-8 w-8 p-0"
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('underline')}
                className="h-8 w-8 p-0"
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('justifyLeft')}
                className="h-8 w-8 p-0"
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('justifyCenter')}
                className="h-8 w-8 p-0"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('justifyRight')}
                className="h-8 w-8 p-0"
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('justifyFull')}
                className="h-8 w-8 p-0"
                title="Justify"
              >
                <AlignJustify className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('formatBlock', '<h1>')}
                className="h-8 px-2"
                title="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('formatBlock', '<h2>')}
                className="h-8 px-2"
                title="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('formatBlock', '<h3>')}
                className="h-8 px-2"
                title="Heading 3"
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('insertUnorderedList')}
                className="h-8 w-8 p-0"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('insertOrderedList')}
                className="h-8 w-8 p-0"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={insertLink}
                className="h-8 w-8 p-0"
                title="Insert Link"
              >
                <Link className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleOpenImageModal}
                className="h-8 w-8 p-0"
                title="Insert Image"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('formatBlock', '<blockquote>')}
                className="h-8 w-8 p-0"
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertHTML('<code></code>')}
                className="h-8 w-8 p-0"
                title="Code"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('insertHorizontalRule')}
                className="h-8 w-8 p-0"
                title="Horizontal Rule"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFormatting}
                className="h-8 w-8 p-0"
                title="Clear Formatting"
              >
                <Type className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(editorRef.current?.innerText || '');
                  toast.success('Text copied to clipboard');
                }}
                className="h-8 px-2"
                title="Copy Text"
              >
                <Copy className="h-4 w-4 ml-1" />
                Copy
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 px-2"
                title={isFullscreen ? "Minimize" : "Maximize"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4 ml-1" />
                ) : (
                  <Maximize2 className="h-4 w-4 ml-1" />
                )}
                {isFullscreen ? "Minimize" : "Maximize"}
              </Button>
            </div>
          </div>
        </div>
        )}

        <div className="editor-root-container">
          <div
            ref={editorRef}
            contentEditable={!disabled}
            className="wysiwyg-editor"
            data-placeholder={placeholder}
            onInput={handleEditorChange}
            onBlur={handleEditorChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setTimeout(handleEditorChange, 0);
              }
            }}
            suppressContentEditableWarning={true}
          />
        </div>
      </div>

      {showImageUpload && <ImageUploadModal />}
      {/* Resize Overlay */
        selectedImage && resizeOverlay && (
          <div
            ref={overlayRef}
            className="resize-overlay"
            style={{
              top: resizeOverlay.top,
              left: resizeOverlay.left,
              width: resizeOverlay.width,
              height: resizeOverlay.height,
              /* Need to be relative to the editor container which should have position: relative */
            }}
          >
            <div className="resize-handle handle-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
            <div className="resize-handle handle-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
            <div className="resize-handle handle-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
            <div className="resize-handle handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
          </div>
        )}
    </div>
  );
};