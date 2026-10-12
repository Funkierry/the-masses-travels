export function readStored<T>(key:string,fallback:T):T {try{const v=localStorage.getItem(`masses:${key}`);return v===null?fallback:JSON.parse(v) as T;}catch{return fallback;}}
export function saveStored(key:string,value:unknown){try{localStorage.setItem(`masses:${key}`,JSON.stringify(value));return true;}catch{return false;}}
