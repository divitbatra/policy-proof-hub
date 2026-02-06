// Wrapper for @turbodocx/html-to-docx browser build
// The browser build uses a global `var HTMLToDOCX = ...` pattern,
// which doesn't work with ESM imports. We load it via a script tag instead.

let cachedConvert: any = null;

async function loadHTMLToDOCX(): Promise<(html: string, header?: string | null, options?: any) => Promise<Blob>> {
  if (cachedConvert) return cachedConvert;

  // Fetch the browser build and evaluate it
  const scriptUrl = new URL(
    "../../node_modules/@turbodocx/html-to-docx/dist/html-to-docx.browser.js",
    import.meta.url
  ).href;

  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(`Failed to load html-to-docx: ${response.status}`);
  }

  const scriptText = await response.text();

  // Polyfill `global` for browser environment before evaluating
  const preamble = `if(typeof global==="undefined"){var global=globalThis||window||self;}`;
  const fn = new Function(`${preamble}\n${scriptText}\nreturn HTMLToDOCX;`);
  const convert = fn();

  if (typeof convert !== "function") {
    throw new Error("HTMLToDOCX is not a function after loading browser build");
  }

  cachedConvert = convert;
  return convert;
}

export default loadHTMLToDOCX;
