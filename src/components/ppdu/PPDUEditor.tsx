import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Table,
  Plus,
  Heading1,
  Heading2,
  Heading3,
  IndentDecrease,
  IndentIncrease,
  Link,
  Unlink,
  Quote,
  Minus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PPDUEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

const HEADER_BG_COLOR = "#B4C6E7"; // Blue header background
const ALT_HEADER_BG_COLOR = "#D9E2F3"; // Lighter blue for alternate headers
const GREEN_BG_COLOR = "#E2EFDA"; // Green background
const YELLOW_BG_COLOR = "#FFF2CC"; // Yellow background
const RED_BG_COLOR = "#FCE4D6"; // Red/Orange background

const TEXT_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Dark Red", value: "#C00000" },
  { name: "Red", value: "#FF0000" },
  { name: "Orange", value: "#ED7D31" },
  { name: "Dark Yellow", value: "#C09100" },
  { name: "Green", value: "#00B050" },
  { name: "Dark Green", value: "#375623" },
  { name: "Teal", value: "#00B0F0" },
  { name: "Blue", value: "#0070C0" },
  { name: "Dark Blue", value: "#002060" },
  { name: "Purple", value: "#7030A0" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#FFFF00" },
  { name: "Bright Green", value: "#00FF00" },
  { name: "Cyan", value: "#00FFFF" },
  { name: "Pink", value: "#FF00FF" },
  { name: "Light Blue", value: "#ADD8E6" },
  { name: "Light Green", value: "#90EE90" },
  { name: "Light Yellow", value: "#FFFACD" },
  { name: "None", value: "transparent" },
];

const PPDUEditor = ({ content, onContentChange }: PPDUEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  }, [onContentChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  };

  const insertTable = (rows: number, cols: number, hasHeader: boolean = true, headerColor: string = HEADER_BG_COLOR) => {
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">`;
    
    for (let i = 0; i < rows; i++) {
      tableHtml += "<tr>";
      for (let j = 0; j < cols; j++) {
        const isHeader = hasHeader && i === 0;
        const cellStyle = isHeader
          ? `background-color: ${headerColor}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center;`
          : "border: 1px solid #000; padding: 8px; vertical-align: top;";
        const tag = isHeader ? "th" : "td";
        tableHtml += `<${tag} style="${cellStyle}">${isHeader ? "Header" : "&nbsp;"}</${tag}>`;
      }
      tableHtml += "</tr>";
    }
    
    tableHtml += "</table><p><br></p>";
    execCommand("insertHTML", tableHtml);
  };

  const insertPPDUTable = () => {
    const tableHtml = `
      <h1 style="font-weight: bold; font-size: 24px; margin-bottom: 16px;">Executive Summary</h1>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 20%;">Project/Initiative</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 10%;">Lead</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 40%;">Summary</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 30%;">Status/Next Steps</th>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-weight: bold;">Project Name</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">Name</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">Enter project summary here...</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">Enter status and next steps...</td>
        </tr>
      </table>
      <p><br></p>
    `;
    execCommand("insertHTML", tableHtml);
  };

  const insertStatusTable = () => {
    const tableHtml = `
      <h2 style="font-weight: bold; font-size: 18px; margin: 24px 0 16px 0;">Status Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 30%;">Item</th>
          <th style="background-color: ${GREEN_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%;">On Track</th>
          <th style="background-color: ${YELLOW_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%;">At Risk</th>
          <th style="background-color: ${RED_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%;">Off Track</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 25%;">Notes</th>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">Item 1</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">✓</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
        </tr>
      </table>
      <p><br></p>
    `;
    execCommand("insertHTML", tableHtml);
  };

  const insertKeyDatesTable = () => {
    const tableHtml = `
      <h2 style="font-weight: bold; font-size: 18px; margin: 24px 0 16px 0;">Key Dates</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 25%;">Milestone</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 25%;">Target Date</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 25%;">Status</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 25%;">Notes</th>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
        </tr>
      </table>
      <p><br></p>
    `;
    execCommand("insertHTML", tableHtml);
  };

  const insertRisksTable = () => {
    const tableHtml = `
      <h2 style="font-weight: bold; font-size: 18px; margin: 24px 0 16px 0;">Risks and Issues</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 30%;">Risk/Issue</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%;">Impact</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%;">Likelihood</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 40%;">Mitigation</th>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
        </tr>
      </table>
      <p><br></p>
    `;
    execCommand("insertHTML", tableHtml);
  };

  const insertDecisionsTable = () => {
    const tableHtml = `
      <h2 style="font-weight: bold; font-size: 18px; margin: 24px 0 16px 0;">Decisions Required</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 35%;">Decision</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 20%;">Owner</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 20%;">Due Date</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 25%;">Status</th>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
        </tr>
      </table>
      <p><br></p>
    `;
    execCommand("insertHTML", tableHtml);
  };

  const insertActionItemsTable = () => {
    const tableHtml = `
      <h2 style="font-weight: bold; font-size: 18px; margin: 24px 0 16px 0;">Action Items</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 10%;">#</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 40%;">Action</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 20%;">Owner</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%;">Due Date</th>
          <th style="background-color: ${HEADER_BG_COLOR}; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; width: 15%;">Status</th>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">1</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
        </tr>
      </table>
      <p><br></p>
    `;
    execCommand("insertHTML", tableHtml);
  };

  const setTextColor = (color: string) => {
    execCommand("foreColor", color);
  };

  const setHighlight = (color: string) => {
    execCommand("hiliteColor", color);
  };

  const formatHeading = (level: string) => {
    execCommand("formatBlock", level);
  };

  const insertHorizontalRule = () => {
    execCommand("insertHTML", '<hr style="border: none; border-top: 2px solid #000; margin: 16px 0;"><p><br></p>');
  };

  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const ToolbarButton = ({
    onClick,
    icon: Icon,
    title,
    disabled,
  }: {
    onClick: () => void;
    icon: React.ElementType;
    title: string;
    disabled?: boolean;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="h-8 w-8 p-0"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar Row 1 */}
      <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-2 border-b">
        {/* Font Family */}
        <Select onValueChange={(v) => execCommand("fontName", v)} defaultValue="Calibri">
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Calibri">Calibri</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select onValueChange={(v) => execCommand("fontSize", v)} defaultValue="3">
          <SelectTrigger className="w-16 h-8 text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">8</SelectItem>
            <SelectItem value="2">10</SelectItem>
            <SelectItem value="3">12</SelectItem>
            <SelectItem value="4">14</SelectItem>
            <SelectItem value="5">18</SelectItem>
            <SelectItem value="6">24</SelectItem>
            <SelectItem value="7">36</SelectItem>
          </SelectContent>
        </Select>

        {/* Heading Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2" title="Headings">
              <Heading1 className="h-4 w-4 mr-1" />
              <span className="text-xs">Heading</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => formatHeading("p")}>
              <span className="text-sm">Normal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => formatHeading("h1")}>
              <span className="text-2xl font-bold">Heading 1</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => formatHeading("h2")}>
              <span className="text-xl font-bold">Heading 2</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => formatHeading("h3")}>
              <span className="text-lg font-bold">Heading 3</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => formatHeading("h4")}>
              <span className="text-base font-bold">Heading 4</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Formatting */}
        <ToolbarButton onClick={() => execCommand("bold")} icon={Bold} title="Bold (Ctrl+B)" />
        <ToolbarButton onClick={() => execCommand("italic")} icon={Italic} title="Italic (Ctrl+I)" />
        <ToolbarButton onClick={() => execCommand("underline")} icon={Underline} title="Underline (Ctrl+U)" />
        <ToolbarButton onClick={() => execCommand("strikeThrough")} icon={Strikethrough} title="Strikethrough" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" title="Text Color">
              <span className="text-sm font-bold">A</span>
              <span className="absolute bottom-1 left-1 right-1 h-1 bg-red-600 rounded" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <p className="text-xs text-muted-foreground mb-2">Text Color</p>
            <div className="grid grid-cols-6 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setTextColor(color.value)}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Highlight">
              <span className="text-sm font-bold px-1 bg-yellow-300">ab</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <p className="text-xs text-muted-foreground mb-2">Highlight Color</p>
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setHighlight(color.value)}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value === "transparent" ? "#fff" : color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <ToolbarButton onClick={() => execCommand("justifyLeft")} icon={AlignLeft} title="Align Left" />
        <ToolbarButton onClick={() => execCommand("justifyCenter")} icon={AlignCenter} title="Center" />
        <ToolbarButton onClick={() => execCommand("justifyRight")} icon={AlignRight} title="Right" />
        <ToolbarButton onClick={() => execCommand("justifyFull")} icon={AlignJustify} title="Justify" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <ToolbarButton onClick={() => execCommand("insertUnorderedList")} icon={List} title="Bullet List" />
        <ToolbarButton onClick={() => execCommand("insertOrderedList")} icon={ListOrdered} title="Numbered List" />
        <ToolbarButton onClick={() => execCommand("indent")} icon={IndentIncrease} title="Increase Indent" />
        <ToolbarButton onClick={() => execCommand("outdent")} icon={IndentDecrease} title="Decrease Indent" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Links & Quote */}
        <ToolbarButton onClick={insertLink} icon={Link} title="Insert Link" />
        <ToolbarButton onClick={() => execCommand("unlink")} icon={Unlink} title="Remove Link" />
        <ToolbarButton onClick={() => formatHeading("blockquote")} icon={Quote} title="Block Quote" />
        <ToolbarButton onClick={insertHorizontalRule} icon={Minus} title="Horizontal Line" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Table Insert */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2" title="Insert Table">
              <Table className="h-4 w-4 mr-1" />
              <span className="text-xs">Tables</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem onClick={() => insertPPDUTable()}>
              <Plus className="h-4 w-4 mr-2" />
              Executive Summary Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertStatusTable()}>
              <Plus className="h-4 w-4 mr-2" />
              Status Summary Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertKeyDatesTable()}>
              <Plus className="h-4 w-4 mr-2" />
              Key Dates Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertRisksTable()}>
              <Plus className="h-4 w-4 mr-2" />
              Risks and Issues Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertDecisionsTable()}>
              <Plus className="h-4 w-4 mr-2" />
              Decisions Required Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertActionItemsTable()}>
              <Plus className="h-4 w-4 mr-2" />
              Action Items Table
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <p className="px-2 py-1 text-xs text-muted-foreground">Custom Tables</p>
            <div className="grid grid-cols-4 gap-1 p-2">
              {[2, 3, 4, 5].map((rows) => (
                <Button
                  key={rows}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => insertTable(rows, 4)}
                >
                  {rows}×4
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1 px-2 pb-2">
              {[2, 3, 4, 5].map((rows) => (
                <Button
                  key={`3col-${rows}`}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => insertTable(rows, 3)}
                >
                  {rows}×3
                </Button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => execCommand("undo")} icon={Undo} title="Undo (Ctrl+Z)" />
        <ToolbarButton onClick={() => execCommand("redo")} icon={Redo} title="Redo (Ctrl+Y)" />
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[600px] p-8 focus:outline-none"
        style={{
          fontFamily: "Calibri, Arial, sans-serif",
          fontSize: "11pt",
          lineHeight: "1.5",
        }}
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: content }}
        onPaste={(e) => {
          // Allow rich paste for tables and formatting
          const html = e.clipboardData.getData("text/html");
          if (html) {
            e.preventDefault();
            document.execCommand("insertHTML", false, html);
          }
        }}
        onKeyDown={(e) => {
          // Handle keyboard shortcuts
          if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
              case 'b':
                e.preventDefault();
                execCommand("bold");
                break;
              case 'i':
                e.preventDefault();
                execCommand("italic");
                break;
              case 'u':
                e.preventDefault();
                execCommand("underline");
                break;
            }
          }
        }}
      />
    </div>
  );
};

export default PPDUEditor;
