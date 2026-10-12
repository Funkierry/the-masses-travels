export const clamp=(x:number,min=0,max=1)=>Math.max(min,Math.min(max,x));
export const progress=(t:number,a:number,b:number)=>clamp((t-a)/(b-a));
export const smooth=(x:number)=>x*x*(3-2*x);
export const wrap=(value:number,length:number)=>((value%length)+length)%length;
