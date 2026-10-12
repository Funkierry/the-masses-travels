declare global { interface Window { __MASSES_ASSETS__?: Record<string,string> } }

// The portable build provides Blob URLs; the development build uses regular files.
export function assetUrl(name:string):string {
  return window.__MASSES_ASSETS__?.[name] ?? `/assets/${name}`;
}
export function resolveMarkupAssets(markup:string):string {
  return markup.replace(/\/assets\/([\w./-]+\.\w+)/g,(_match,name:string)=>assetUrl(name));
}
