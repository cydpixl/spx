import {createMediaHandler} from '../media.mjs';
const handle=createMediaHandler();
export default {
 fetch(request){
  const url=new URL(request.url);
  url.pathname='/media';
  return handle(new Request(url,request));
 }
};
