export function formatAIResponse(
text:string
){

return text
.replace(/\*\*/g,"")
.replace(/\*/g,"")
.replace(/###/g,"")
.replace(/##/g,"")
.replace(/#/g,"")
.trim();

}