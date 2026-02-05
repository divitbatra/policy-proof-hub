const HEADER_BG_COLOR = "#B4C6E7";
const GREEN_BG_COLOR = "#E2EFDA";
const YELLOW_BG_COLOR = "#FFF2CC";
const RED_BG_COLOR = "#FCE4D6";

export const PPDU_BRIEF_TEMPLATE = `
<h1 style="font-weight: bold; font-size: 24px; margin-bottom: 8px; text-align: center;">PPDU Weekly Brief</h1>
<p style="text-align: center; margin-bottom: 24px; color: #666;">Week of [Date Range]</p>

<h2 style="font-weight: bold; font-size: 18px; margin: 24px 0 16px 0;">Executive Summary</h2>
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
  <tr>
    <td style="border: 1px solid #000; padding: 8px; vertical-align: top; font-weight: bold;">&nbsp;</td>
    <td style="border: 1px solid #000; padding: 8px; vertical-align: top; text-align: center;">&nbsp;</td>
    <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
    <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">&nbsp;</td>
  </tr>
</table>

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
`;

export const generateDownloadHtml = (title: string, content: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { 
      font-family: Calibri, Arial, sans-serif; 
      padding: 40px; 
      max-width: 900px; 
      margin: 0 auto;
      font-size: 11pt;
      line-height: 1.5;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 16px 0;
    }
    th, td { 
      border: 1px solid #000; 
      padding: 8px;
      vertical-align: top;
    }
    th { 
      background-color: #B4C6E7; 
      font-weight: bold;
      text-align: center;
    }
    h1 { font-size: 24px; font-weight: bold; }
    h2 { font-size: 18px; font-weight: bold; margin-top: 24px; }
    h3 { font-size: 14px; font-weight: bold; margin-top: 16px; }
    ul, ol { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    blockquote { 
      border-left: 4px solid #B4C6E7; 
      margin: 16px 0; 
      padding-left: 16px; 
      color: #555;
    }
    hr { 
      border: none; 
      border-top: 2px solid #000; 
      margin: 16px 0; 
    }
    a { color: #0070C0; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
};
